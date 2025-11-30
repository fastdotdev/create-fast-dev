import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Template, TransformContext } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { tsconfigAdaptTransformer } from "./tsconfig-adapt.js";

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

describe("tsconfigAdaptTransformer", () => {
  let tempDir: string;
  let monorepoRoot: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "fast-dev-test-"));
    monorepoRoot = await mkdtemp(join(tmpdir(), "fast-dev-monorepo-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    await rm(monorepoRoot, { recursive: true, force: true });
  });

  describe("mode checks", () => {
    it("should skip when mode is standalone", async () => {
      await writeFile(
        join(tempDir, "tsconfig.json"),
        JSON.stringify({ extends: "./original.json" })
      );

      const ctx = createTestContext(tempDir, {
        mode: "standalone",
        monorepoContext: {
          isMonorepo: true,
          rootDir: monorepoRoot,
          packageManager: "pnpm",
          baseTsconfig: join(monorepoRoot, "tsconfig.base.json"),
        },
      });

      await tsconfigAdaptTransformer.transform(ctx);

      const tsconfig = JSON.parse(
        await readFile(join(tempDir, "tsconfig.json"), "utf-8")
      );
      expect(tsconfig.extends).toBe("./original.json");
    });

    it("should skip when no tsconfig settings and no base tsconfig", async () => {
      await writeFile(
        join(tempDir, "tsconfig.json"),
        JSON.stringify({ extends: "./original.json" })
      );

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: monorepoRoot,
          packageManager: "pnpm",
          baseTsconfig: undefined,
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: { enabled: true, type: "app" },
        },
      });

      await tsconfigAdaptTransformer.transform(ctx);

      const tsconfig = JSON.parse(
        await readFile(join(tempDir, "tsconfig.json"), "utf-8")
      );
      expect(tsconfig.extends).toBe("./original.json");
    });

    it("should skip when tsconfig.json doesn't exist", async () => {
      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: monorepoRoot,
          packageManager: "pnpm",
          baseTsconfig: join(monorepoRoot, "tsconfig.base.json"),
        },
      });

      // Should not throw
      await expect(tsconfigAdaptTransformer.transform(ctx)).resolves.not.toThrow();
    });
  });

  describe("extends update", () => {
    it("should use explicit extends from template config", async () => {
      await writeFile(
        join(tempDir, "tsconfig.json"),
        JSON.stringify({ compilerOptions: { strict: true } })
      );

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: monorepoRoot,
          packageManager: "pnpm",
          baseTsconfig: join(monorepoRoot, "tsconfig.base.json"),
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: {
            enabled: true,
            type: "app",
            tsconfig: {
              extends: "@repo/typescript-config/nextjs.json",
            },
          },
        },
      });

      await tsconfigAdaptTransformer.transform(ctx);

      const tsconfig = JSON.parse(
        await readFile(join(tempDir, "tsconfig.json"), "utf-8")
      );
      expect(tsconfig.extends).toBe("@repo/typescript-config/nextjs.json");
    });

    it("should auto-detect base tsconfig path", async () => {
      await writeFile(
        join(tempDir, "tsconfig.json"),
        JSON.stringify({ compilerOptions: { strict: true } })
      );

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: monorepoRoot,
          packageManager: "pnpm",
          baseTsconfig: join(monorepoRoot, "tsconfig.base.json"),
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: { enabled: true, type: "app" },
        },
      });

      await tsconfigAdaptTransformer.transform(ctx);

      const tsconfig = JSON.parse(
        await readFile(join(tempDir, "tsconfig.json"), "utf-8")
      );
      // Should contain relative path to tsconfig.base.json
      expect(tsconfig.extends).toContain("tsconfig.base.json");
    });

    it("should work with base tsconfig when no template config", async () => {
      await writeFile(
        join(tempDir, "tsconfig.json"),
        JSON.stringify({ compilerOptions: { strict: true } })
      );

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: monorepoRoot,
          packageManager: "pnpm",
          baseTsconfig: join(monorepoRoot, "tsconfig.base.json"),
        },
      });

      await tsconfigAdaptTransformer.transform(ctx);

      const tsconfig = JSON.parse(
        await readFile(join(tempDir, "tsconfig.json"), "utf-8")
      );
      expect(tsconfig.extends).toContain("tsconfig.base.json");
    });
  });

  describe("compiler options", () => {
    it("should apply overrides to compilerOptions", async () => {
      await writeFile(
        join(tempDir, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: monorepoRoot,
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: {
            enabled: true,
            type: "app",
            tsconfig: {
              overrides: { outDir: "dist", rootDir: "src" },
            },
          },
        },
      });

      await tsconfigAdaptTransformer.transform(ctx);

      const tsconfig = JSON.parse(
        await readFile(join(tempDir, "tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.outDir).toBe("dist");
      expect(tsconfig.compilerOptions.rootDir).toBe("src");
    });

    it("should merge with existing compilerOptions", async () => {
      await writeFile(
        join(tempDir, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            target: "ES2022",
          },
        })
      );

      const ctx = createTestContext(tempDir, {
        mode: "monorepo",
        monorepoContext: {
          isMonorepo: true,
          rootDir: monorepoRoot,
          packageManager: "pnpm",
        },
        templateConfig: {
          version: "1.0",
          template: { id: "t", name: "T", description: "T", stack: "t", tags: [] },
          monorepo: {
            enabled: true,
            type: "app",
            tsconfig: {
              overrides: { outDir: "dist" },
            },
          },
        },
      });

      await tsconfigAdaptTransformer.transform(ctx);

      const tsconfig = JSON.parse(
        await readFile(join(tempDir, "tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.target).toBe("ES2022");
      expect(tsconfig.compilerOptions.outDir).toBe("dist");
    });
  });
});
