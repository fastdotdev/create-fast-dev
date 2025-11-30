import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { MonorepoContext, PackageManager } from "@repo/shared";

/**
 * Detect if we're inside a Turborepo monorepo by walking up directories
 * looking for turbo.json
 */
export async function detectMonorepo(startDir: string): Promise<MonorepoContext | null> {
  let currentDir = startDir;
  const root = "/"; // Stop at filesystem root

  while (currentDir !== root) {
    const turboPath = join(currentDir, "turbo.json");

    try {
      await access(turboPath);
      // Found turbo.json, build context
      return await buildMonorepoContext(currentDir);
    } catch {
      // turbo.json not found, go up one level
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        // Reached root
        break;
      }
      currentDir = parentDir;
    }
  }

  return null;
}

/**
 * Build the monorepo context from a detected root directory
 */
async function buildMonorepoContext(rootDir: string): Promise<MonorepoContext> {
  const packageManager = await detectPackageManagerFromRoot(rootDir);

  // Check for base tsconfig
  const baseTsconfigPath = join(rootDir, "tsconfig.base.json");
  let baseTsconfig: string | undefined;
  try {
    await access(baseTsconfigPath);
    baseTsconfig = baseTsconfigPath;
  } catch {
    // No base tsconfig
  }

  // Find workspace config
  const workspaceConfigPath = await findWorkspaceConfig(rootDir, packageManager);

  return {
    isMonorepo: true,
    rootDir,
    turboConfigPath: join(rootDir, "turbo.json"),
    workspaceConfigPath,
    packageManager,
    baseTsconfig,
  };
}

/**
 * Detect package manager from monorepo root
 */
async function detectPackageManagerFromRoot(rootDir: string): Promise<PackageManager> {
  const lockfiles: Array<{ file: string; pm: PackageManager }> = [
    { file: "pnpm-lock.yaml", pm: "pnpm" },
    { file: "yarn.lock", pm: "yarn" },
    { file: "bun.lockb", pm: "bun" },
    { file: "package-lock.json", pm: "npm" },
  ];

  for (const { file, pm } of lockfiles) {
    try {
      await access(join(rootDir, file));
      return pm;
    } catch {
      // Lockfile not found
    }
  }

  // Check package.json packageManager field
  try {
    const pkgPath = join(rootDir, "package.json");
    const content = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(content) as { packageManager?: string };
    if (pkg.packageManager) {
      const pm = pkg.packageManager.split("@")[0] as PackageManager;
      if (["npm", "yarn", "pnpm", "bun"].includes(pm)) {
        return pm;
      }
    }
  } catch {
    // No package.json or no packageManager field
  }

  // Default for Turborepo
  return "pnpm";
}

/**
 * Find workspace config file path
 */
async function findWorkspaceConfig(
  rootDir: string,
  pm: PackageManager
): Promise<string | undefined> {
  if (pm === "pnpm") {
    const pnpmWorkspace = join(rootDir, "pnpm-workspace.yaml");
    try {
      await access(pnpmWorkspace);
      return pnpmWorkspace;
    } catch {
      // Not found
    }
  }

  // For yarn/npm, workspaces are in package.json
  // For now, we don't return a separate path for those
  return undefined;
}

/**
 * Get the apps directory path in a monorepo
 */
export function getAppsDir(rootDir: string): string {
  return join(rootDir, "apps");
}

/**
 * Get the packages directory path in a monorepo
 */
export function getPackagesDir(rootDir: string): string {
  return join(rootDir, "packages");
}

/**
 * Get the target directory based on template type
 */
export function getTargetDir(rootDir: string, targetType: "app" | "package"): string {
  return targetType === "app" ? getAppsDir(rootDir) : getPackagesDir(rootDir);
}
