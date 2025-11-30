import { access, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

import type { TransformContext, Transformer } from "@repo/shared";

interface TsConfig {
  extends?: string;
  compilerOptions?: Record<string, unknown>;
  include?: string[];
  exclude?: string[];
  [key: string]: unknown;
}

/**
 * Adapts TypeScript configuration for monorepo installation.
 *
 * This transformer:
 * 1. Updates the extends path to point to the monorepo base tsconfig
 * 2. Applies any compiler option overrides from the template config
 */
export const tsconfigAdaptTransformer: Transformer = {
  name: "tsconfig-adapt",
  description: "Adapts TypeScript configuration for monorepo installation",

  async transform(ctx: TransformContext): Promise<void> {
    // Only run in monorepo mode
    if (ctx.mode !== "monorepo" || !ctx.monorepoContext) {
      return;
    }

    const monorepoConfig = ctx.templateConfig?.monorepo;
    const tsconfigSettings = monorepoConfig?.tsconfig;

    // If no tsconfig settings and no base tsconfig, skip
    if (!tsconfigSettings && !ctx.monorepoContext.baseTsconfig) {
      return;
    }

    const tsconfigPath = join(ctx.projectPath, "tsconfig.json");

    // Check if tsconfig.json exists
    try {
      await access(tsconfigPath);
    } catch {
      // No tsconfig.json, skip
      return;
    }

    // Read current tsconfig
    let tsconfig: TsConfig;
    try {
      const content = await readFile(tsconfigPath, "utf-8");
      tsconfig = JSON.parse(content) as TsConfig;
    } catch {
      // Invalid JSON, skip
      return;
    }

    // Calculate relative path from project to monorepo root
    const relativePath = relative(ctx.projectPath, ctx.monorepoContext.rootDir);

    // Update extends
    if (tsconfigSettings?.extends) {
      // Use explicit extends from template config
      tsconfig.extends = tsconfigSettings.extends;
    } else if (ctx.monorepoContext.baseTsconfig) {
      // Auto-detect: extend the base tsconfig
      tsconfig.extends = join(relativePath, "tsconfig.base.json");
    }

    // Apply compiler option overrides
    if (tsconfigSettings?.overrides) {
      tsconfig.compilerOptions = {
        ...tsconfig.compilerOptions,
        ...tsconfigSettings.overrides,
      };
    }

    // Write updated tsconfig
    await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2) + "\n", "utf-8");
  },
};
