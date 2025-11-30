import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { TransformContext, Transformer } from "@repo/shared";

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface MonorepoAdaptOptions {
  /** Workspace prefix for package names (default: @repo) */
  workspacePrefix?: string;
}

/**
 * Adapts a template for Turborepo monorepo installation.
 *
 * This transformer:
 * 1. Removes files that shouldn't be in monorepo apps/packages
 * 2. Updates package.json name to workspace format
 * 3. Converts specified dependencies to workspace protocol
 */
export const monorepoAdaptTransformer: Transformer = {
  name: "monorepo-adapt",
  description: "Adapts template for Turborepo monorepo installation",

  async transform(
    ctx: TransformContext,
    options?: Record<string, unknown>
  ): Promise<void> {
    // Only run in monorepo mode
    if (ctx.mode !== "monorepo" || !ctx.monorepoContext) {
      return;
    }

    const monorepoConfig = ctx.templateConfig?.monorepo;
    if (!monorepoConfig) {
      return;
    }

    const opts = options as MonorepoAdaptOptions | undefined;
    const workspacePrefix = opts?.workspacePrefix ?? "@repo";

    // 1. Remove files that shouldn't be in monorepo apps/packages
    if (monorepoConfig.removeFiles?.length) {
      for (const file of monorepoConfig.removeFiles) {
        const fullPath = join(ctx.projectPath, file);
        try {
          await rm(fullPath, { recursive: true, force: true });
        } catch {
          // File doesn't exist, ignore
        }
      }
    }

    // 2. Update package.json
    const pkgPath = join(ctx.projectPath, "package.json");
    let pkg: PackageJson;

    try {
      const content = await readFile(pkgPath, "utf-8");
      pkg = JSON.parse(content) as PackageJson;
    } catch {
      // No package.json, skip
      return;
    }

    // Update name to workspace format
    pkg.name = `${workspacePrefix}/${ctx.projectName}`;

    // 3. Convert specified deps to workspace protocol
    if (monorepoConfig.workspaceDeps?.length) {
      for (const dep of monorepoConfig.workspaceDeps) {
        if (pkg.dependencies?.[dep]) {
          pkg.dependencies[dep] = "workspace:*";
        }
        if (pkg.devDependencies?.[dep]) {
          pkg.devDependencies[dep] = "workspace:*";
        }
      }
    }

    // Write updated package.json
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  },
};
