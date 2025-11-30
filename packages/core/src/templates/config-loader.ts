import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";

import type { Template, TemplateConfig } from "@repo/shared";

const CONFIG_FILENAME = "fast-dev.config.json";

/**
 * Load template config from fast-dev.config.json in the project directory
 */
export async function loadTemplateConfig(
  projectPath: string
): Promise<TemplateConfig | null> {
  const configPath = join(projectPath, CONFIG_FILENAME);

  try {
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content) as TemplateConfig;

    if (config.version !== "1.0") {
      console.warn(`Unknown template config version: ${config.version}`);
    }

    return config;
  } catch {
    // Config file doesn't exist or is invalid
    return null;
  }
}

/**
 * Merge template config into a Template object
 * Used when config is loaded from the template repo
 */
export function mergeConfigIntoTemplate(
  baseTemplate: Template,
  config: TemplateConfig
): Template {
  return {
    ...baseTemplate,
    id: config.template.id,
    name: config.template.name,
    description: config.template.description,
    stackId: config.template.stack,
    tags: config.template.tags,
    maintainer: config.template.maintainer,
    docsUrl: config.template.docsUrl,
    prompts: config.prompts ?? baseTemplate.prompts,
    transforms: config.transforms ?? baseTemplate.transforms,
    postActions: config.postActions ?? baseTemplate.postActions,
  };
}

/**
 * Create a minimal Template from a TemplateConfig
 * Used when cloning directly via git URL without registry
 */
export function createTemplateFromConfig(
  config: TemplateConfig,
  gitUrl: string,
  branch?: string
): Template {
  return {
    id: config.template.id,
    slug: config.template.id,
    name: config.template.name,
    description: config.template.description,
    stackId: config.template.stack,
    gitUrl,
    branch,
    prompts: config.prompts ?? [],
    transforms: config.transforms ?? [],
    postActions: config.postActions,
    tags: config.template.tags,
    maintainer: config.template.maintainer,
    docsUrl: config.template.docsUrl,
  };
}

/**
 * Create a fallback template for templates without fast-dev.config.json
 * Applies only the rename-package transformer
 */
export function createFallbackTemplate(gitUrl: string, branch?: string): Template {
  return {
    id: "custom",
    slug: "custom",
    name: "Custom Template",
    description: "Template without fast-dev.config.json",
    stackId: "custom",
    gitUrl,
    branch,
    prompts: [],
    transforms: [{ type: "builtin", transformer: "rename-package" }],
    tags: [],
  };
}

/**
 * Clean up template config files after transformations
 */
export async function cleanupTemplateConfig(projectPath: string): Promise<void> {
  try {
    // Remove fast-dev.config.json
    await rm(join(projectPath, CONFIG_FILENAME), { force: true });
  } catch {
    // File doesn't exist, ignore
  }

  try {
    // Also clean up legacy .fast-dev directory if it exists
    await rm(join(projectPath, ".fast-dev"), { recursive: true, force: true });
  } catch {
    // Directory doesn't exist, ignore
  }
}
