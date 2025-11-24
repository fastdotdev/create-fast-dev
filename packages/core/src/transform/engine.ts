import type { TransformContext, Transformer } from "@repo/shared";

import type { Logger } from "../logger/index.js";
import { envSetupTransformer } from "./builtin/env-setup.js";
import { readmePersonalizeTransformer } from "./builtin/readme-personalize.js";
import { renamePackageTransformer } from "./builtin/rename-package.js";
import { toggleFeatureTransformer } from "./builtin/toggle-feature.js";

/**
 * Registry of built-in transformers
 */
const builtinTransformers: Map<string, Transformer> = new Map([
  ["rename-package", renamePackageTransformer],
  ["env-setup", envSetupTransformer],
  ["toggle-feature", toggleFeatureTransformer],
  ["readme-personalize", readmePersonalizeTransformer],
]);

/**
 * Register a custom transformer
 */
export function registerTransformer(transformer: Transformer): void {
  builtinTransformers.set(transformer.name, transformer);
}

/**
 * Get a transformer by name
 */
export function getTransformer(name: string): Transformer | undefined {
  return builtinTransformers.get(name);
}

/**
 * Run all transformations for a template
 */
export async function runTransformations(
  ctx: TransformContext,
  logger: Logger
): Promise<void> {
  const { template } = ctx;

  for (const transform of template.transforms) {
    const transformer = getTransformer(transform.transformer);

    if (!transformer) {
      logger.warn(`Unknown transformer: ${transform.transformer}, skipping...`);
      continue;
    }

    logger.debug(`Running transformer: ${transformer.name}`);

    try {
      await transformer.transform(ctx, transform.options);
      logger.debug(`Completed transformer: ${transformer.name}`);
    } catch (error) {
      logger.error(`Transformer ${transformer.name} failed:`, error);
      throw error;
    }
  }
}

/**
 * List all available transformers
 */
export function listTransformers(): Transformer[] {
  return Array.from(builtinTransformers.values());
}
