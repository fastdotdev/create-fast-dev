import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Template, TransformContext } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { monorepoAdaptTransformer } from "./monorepo-adapt.js";

function createTestTemplate(): Template {
  return {
    id: "test",
    slug: "test",
    name: "Test",
    description: "Test template",
    stackId: "test",
    gitUrl: "github:test/test",
    prompts: [],
    transforms: [],
    tags: [],
  };
}

function createTestContext(
  projectPath: string,
  overrides: Partial<TransformContext> = {}
): TransformContext {
  return {
    projectPath,
    projectName: "test-project",
    answers: {},
    template: createTestTemplate(),
    mode: "standalone",
    ...overrides,
  };
}

describe("monorepoAdaptTransformer", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "fast-dev-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("mode checks", () => {
    it("should skip when mode is standalone", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "original" })
      );

      const ctx = createTestContext(tempDir, {
        mode: "standalone",
        monorepoContext: {
          isMonorepo: true,
          rootDir: "/root",
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: { enabled: true, type: "app" },
        },
      });

      await monorepoAdaptTransformer.transform(ctx);

      const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
      expect(pkg.name).toBe("original");
    });

    it("should skip when monorepoContext is missing", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "original" })
      );

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: undefined,
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: { enabled: true, type: "app" },
        },
      });

      await monorepoAdaptTransformer.transform(ctx);

      const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
      expect(pkg.name).toBe("original");
    });

    it("should skip when templateConfig.monorepo is missing", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "original" })
      );

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: "/root",
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
        },
      });

      await monorepoAdaptTransformer.transform(ctx);

      const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
      expect(pkg.name).toBe("original");
    });
  });

  describe("file removal", () => {
    it("should remove files listed in removeFiles", async () => {
      await writeFile(join(tempDir, "turbo.json"), "{}");
      await writeFile(join(tempDir, "package.json"), JSON.stringify({ name: "test" }));

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: "/root",
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: {
            enabled: true,
            type: "app",
            removeFiles: ["turbo.json"],
          },
        },
      });

      await monorepoAdaptTransformer.transform(ctx);

      await expect(readFile(join(tempDir, "turbo.json"))).rejects.toThrow();
    });

    it("should handle non-existent files gracefully", async () => {
      await writeFile(join(tempDir, "package.json"), JSON.stringify({ name: "test" }));

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: "/root",
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: {
            enabled: true,
            type: "app",
            removeFiles: ["non-existent.txt"],
          },
        },
      });

      // Should not throw
      await expect(monorepoAdaptTransformer.transform(ctx)).resolves.not.toThrow();
    });

    it("should remove directories recursively", async () => {
      await mkdir(join(tempDir, ".github", "workflows"), { recursive: true });
      await writeFile(join(tempDir, ".github", "workflows", "ci.yml"), "");
      await writeFile(join(tempDir, "package.json"), JSON.stringify({ name: "test" }));

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: "/root",
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: {
            enabled: true,
            type: "app",
            removeFiles: [".github"],
          },
        },
      });

      await monorepoAdaptTransformer.transform(ctx);

      await expect(
        readFile(join(tempDir, ".github", "workflows", "ci.yml"))
      ).rejects.toThrow();
    });
  });

  describe("package.json updates", () => {
    it("should update package name with workspace prefix", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "original-name" })
      );

      const ctx = createTestContext(tempDir, {
        projectName: "my-app",
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: "/root",
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: { enabled: true, type: "app" },
        },
      });

      await monorepoAdaptTransformer.transform(ctx);

      const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
      expect(pkg.name).toBe("@repo/my-app");
    });

    it("should use custom workspacePrefix when provided", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "original-name" })
      );

      const ctx = createTestContext(tempDir, {
        projectName: "my-app",
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: "/root",
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: { enabled: true, type: "app" },
        },
      });

      await monorepoAdaptTransformer.transform(ctx, { workspacePrefix: "@acme" });

      const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
      expect(pkg.name).toBe("@acme/my-app");
    });

    it("should skip if no package.json exists", async () => {
      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: "/root",
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: { enabled: true, type: "app" },
        },
      });

      // Should not throw
      await expect(monorepoAdaptTransformer.transform(ctx)).resolves.not.toThrow();
    });
  });

  describe("workspace deps conversion", () => {
    it("should convert dependencies to workspace:*", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: {
            "@repo/ui": "^1.0.0",
            react: "^18.0.0",
          },
        })
      );

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: "/root",
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: {
            enabled: true,
            type: "app",
            workspaceDeps: ["@repo/ui"],
          },
        },
      });

      await monorepoAdaptTransformer.transform(ctx);

      const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
      expect(pkg.dependencies["@repo/ui"]).toBe("workspace:*");
      expect(pkg.dependencies["react"]).toBe("^18.0.0");
    });

    it("should convert devDependencies to workspace:*", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test",
          devDependencies: {
            "@repo/eslint-config": "^1.0.0",
            typescript: "^5.0.0",
          },
        })
      );

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: "/root",
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: {
            enabled: true,
            type: "app",
            workspaceDeps: ["@repo/eslint-config"],
          },
        },
      });

      await monorepoAdaptTransformer.transform(ctx);

      const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
      expect(pkg.devDependencies["@repo/eslint-config"]).toBe("workspace:*");
      expect(pkg.devDependencies["typescript"]).toBe("^5.0.0");
    });

    it("should only convert deps listed in workspaceDeps", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: {
            "@repo/ui": "^1.0.0",
            "@repo/shared": "^1.0.0",
          },
        })
      );

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: "/root",
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: {
            enabled: true,
            type: "app",
            workspaceDeps: ["@repo/ui"],
          },
        },
      });

      await monorepoAdaptTransformer.transform(ctx);

      const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
      expect(pkg.dependencies["@repo/ui"]).toBe("workspace:*");
      expect(pkg.dependencies["@repo/shared"]).toBe("^1.0.0");
    });
  });
});
