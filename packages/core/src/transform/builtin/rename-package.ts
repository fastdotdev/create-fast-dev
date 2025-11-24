import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { TransformContext, Transformer } from "@repo/shared";

interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  repository?: unknown;
  bugs?: unknown;
  homepage?: string;
  [key: string]: unknown;
}

/**
 * Renames the package and updates related fields in package.json
 */
export const renamePackageTransformer: Transformer = {
  name: "rename-package",
  description: "Updates package.json name, version, and clears template-specific fields",

  async transform(ctx: TransformContext): Promise<void> {
    const pkgPath = join(ctx.projectPath, "package.json");

    const content = await readFile(pkgPath, "utf-8");
    const pkg: PackageJson = JSON.parse(content);

    // Update name
    pkg.name = ctx.projectName;

    // Reset version for new project
    pkg.version = "0.0.1";

    // Update description if provided
    if (ctx.answers["description"]) {
      pkg.description = ctx.answers["description"] as string;
    }

    // Update author if provided
    if (ctx.answers["author"]) {
      pkg.author = ctx.answers["author"] as string;
    }

    // Clear template-specific fields
    delete pkg.repository;
    delete pkg.bugs;
    delete pkg.homepage;

    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  },
};
