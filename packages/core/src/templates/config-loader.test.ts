import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Template, TemplateConfig } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cleanupTemplateConfig,
  createFallbackTemplate,
  createTemplateFromConfig,
  loadTemplateConfig,
  mergeConfigIntoTemplate,
} from "./config-loader.js";

function createValidConfig(): TemplateConfig {
  return {
    version: "1.0",
    template: {
      id: "test-template",
      name: "Test Template",
      description: "A test template",
      stack: "nextjs",
      tags: ["test", "example"],
    },
  };
}

function createBaseTemplate(): Template {
  return {
    id: "base",
    slug: "base",
    name: "Base Template",
    description: "Base description",
    stackId: "base",
    gitUrl: "github:test/base",
    prompts: [{ type: "text", name: "author", message: "Author?" }],
    transforms: [{ type: "builtin", transformer: "rename-package" }],
    tags: ["base"],
  };
}

describe("loadTemplateConfig", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "fast-dev-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should load valid fast-dev.config.json", async () => {
    const config = createValidConfig();
    await writeFile(join(tempDir, "fast-dev.config.json"), JSON.stringify(config));

    const result = await loadTemplateConfig(tempDir);

    expect(result).not.toBeNull();
    expect(result?.version).toBe("1.0");
    expect(result?.template.id).toBe("test-template");
    expect(result?.template.name).toBe("Test Template");
  });

  it("should return null when config doesn't exist", async () => {
    const result = await loadTemplateConfig(tempDir);

    expect(result).toBeNull();
  });

  it("should return null when config is invalid JSON", async () => {
    await writeFile(join(tempDir, "fast-dev.config.json"), "{ invalid json }");

    const result = await loadTemplateConfig(tempDir);

    expect(result).toBeNull();
  });

  it("should warn on unknown version", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = { ...createValidConfig(), version: "2.0" };
    await writeFile(join(tempDir, "fast-dev.config.json"), JSON.stringify(config));

    await loadTemplateConfig(tempDir);

    expect(warnSpy).toHaveBeenCalledWith("Unknown template config version: 2.0");
    warnSpy.mockRestore();
  });
});

describe("mergeConfigIntoTemplate", () => {
  it("should merge config fields into template", () => {
    const base = createBaseTemplate();
    const config = createValidConfig();

    const result = mergeConfigIntoTemplate(base, config);

    expect(result.id).toBe("test-template");
    expect(result.name).toBe("Test Template");
    expect(result.description).toBe("A test template");
    expect(result.stackId).toBe("nextjs");
    expect(result.tags).toEqual(["test", "example"]);
    // Should keep base gitUrl
    expect(result.gitUrl).toBe("github:test/base");
  });

  it("should use base template prompts when config has none", () => {
    const base = createBaseTemplate();
    const config = createValidConfig();

    const result = mergeConfigIntoTemplate(base, config);

    expect(result.prompts).toEqual(base.prompts);
  });

  it("should override prompts when config has them", () => {
    const base = createBaseTemplate();
    const config: TemplateConfig = {
      ...createValidConfig(),
      prompts: [{ type: "confirm", name: "useTs", message: "Use TypeScript?" }],
    };

    const result = mergeConfigIntoTemplate(base, config);

    expect(result.prompts).toEqual(config.prompts);
  });

  it("should include maintainer and docsUrl when present", () => {
    const base = createBaseTemplate();
    const config: TemplateConfig = {
      ...createValidConfig(),
      template: {
        ...createValidConfig().template,
        maintainer: "test@example.com",
        docsUrl: "https://docs.example.com",
      },
    };

    const result = mergeConfigIntoTemplate(base, config);

    expect(result.maintainer).toBe("test@example.com");
    expect(result.docsUrl).toBe("https://docs.example.com");
  });
});

describe("createTemplateFromConfig", () => {
  it("should create Template from TemplateConfig", () => {
    const config = createValidConfig();
    const gitUrl = "github:test/template";

    const result = createTemplateFromConfig(config, gitUrl);

    expect(result.id).toBe("test-template");
    expect(result.slug).toBe("test-template");
    expect(result.name).toBe("Test Template");
    expect(result.gitUrl).toBe(gitUrl);
  });

  it("should include branch when provided", () => {
    const config = createValidConfig();

    const result = createTemplateFromConfig(config, "github:test/t", "develop");

    expect(result.branch).toBe("develop");
  });

  it("should use empty arrays for missing prompts/transforms", () => {
    const config = createValidConfig();

    const result = createTemplateFromConfig(config, "github:test/t");

    expect(result.prompts).toEqual([]);
    expect(result.transforms).toEqual([]);
  });

  it("should use prompts/transforms from config when present", () => {
    const config: TemplateConfig = {
      ...createValidConfig(),
      prompts: [{ type: "text", name: "name", message: "Name?" }],
      transforms: [{ type: "builtin", transformer: "toggle-feature" }],
    };

    const result = createTemplateFromConfig(config, "github:test/t");

    expect(result.prompts).toEqual(config.prompts);
    expect(result.transforms).toEqual(config.transforms);
  });
});

describe("createFallbackTemplate", () => {
  it("should create minimal template with rename-package transform", () => {
    const result = createFallbackTemplate("github:user/repo");

    expect(result.transforms).toEqual([
      { type: "builtin", transformer: "rename-package" },
    ]);
  });

  it("should set id and stackId to custom", () => {
    const result = createFallbackTemplate("github:user/repo");

    expect(result.id).toBe("custom");
    expect(result.stackId).toBe("custom");
  });

  it("should include branch when provided", () => {
    const result = createFallbackTemplate("github:user/repo", "main");

    expect(result.branch).toBe("main");
  });

  it("should have empty prompts and tags", () => {
    const result = createFallbackTemplate("github:user/repo");

    expect(result.prompts).toEqual([]);
    expect(result.tags).toEqual([]);
  });
});

describe("cleanupTemplateConfig", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "fast-dev-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should remove fast-dev.config.json", async () => {
    const configPath = join(tempDir, "fast-dev.config.json");
    await writeFile(configPath, "{}");

    await cleanupTemplateConfig(tempDir);

    await expect(access(configPath)).rejects.toThrow();
  });

  it("should remove .fast-dev directory", async () => {
    const fastDevDir = join(tempDir, ".fast-dev");
    await mkdir(fastDevDir);
    await writeFile(join(fastDevDir, "features.json"), "{}");

    await cleanupTemplateConfig(tempDir);

    await expect(access(fastDevDir)).rejects.toThrow();
  });

  it("should not throw when files don't exist", async () => {
    await expect(cleanupTemplateConfig(tempDir)).resolves.not.toThrow();
  });
});
