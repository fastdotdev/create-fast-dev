import { access, constants, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { PackageManager } from "@repo/shared";
import { DEFAULT_PACKAGE_MANAGER } from "@repo/shared";

interface LockfileInfo {
  file: string;
  manager: PackageManager;
}

const LOCKFILES: LockfileInfo[] = [
  { file: "pnpm-lock.yaml", manager: "pnpm" },
  { file: "yarn.lock", manager: "yarn" },
  { file: "package-lock.json", manager: "npm" },
  { file: "bun.lockb", manager: "bun" },
];

/**
 * Detect package manager from lockfile in directory
 */
export async function detectFromLockfile(dir: string): Promise<PackageManager | null> {
  for (const { file, manager } of LOCKFILES) {
    try {
      await access(join(dir, file), constants.R_OK);
      return manager;
    } catch {
      // Lockfile doesn't exist, continue
    }
  }
  return null;
}

/**
 * Detect package manager from package.json packageManager field
 */
export async function detectFromPackageJson(dir: string): Promise<PackageManager | null> {
  try {
    const pkgPath = join(dir, "package.json");
    const content = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(content) as { packageManager?: string };

    if (pkg.packageManager) {
      // Format: "pnpm@8.0.0" or "yarn@3.0.0"
      const match = pkg.packageManager.match(/^(npm|yarn|pnpm|bun)@/);
      if (match?.[1]) {
        return match[1] as PackageManager;
      }
    }
  } catch {
    // No package.json or invalid
  }
  return null;
}

/**
 * Detect package manager from environment
 * Checks npm_config_user_agent which is set when running via a package manager
 */
export function detectFromEnvironment(): PackageManager | null {
  const userAgent = process.env["npm_config_user_agent"];
  if (!userAgent) return null;

  if (userAgent.includes("pnpm")) return "pnpm";
  if (userAgent.includes("yarn")) return "yarn";
  if (userAgent.includes("bun")) return "bun";
  if (userAgent.includes("npm")) return "npm";

  return null;
}

/**
 * Detect the best package manager to use
 *
 * Priority:
 * 1. Lockfile in target directory
 * 2. packageManager field in package.json
 * 3. Environment (how the CLI was invoked)
 * 4. Default (pnpm)
 */
export async function detectPackageManager(dir?: string): Promise<PackageManager> {
  // Check directory if provided
  if (dir) {
    const fromLockfile = await detectFromLockfile(dir);
    if (fromLockfile) return fromLockfile;

    const fromPkgJson = await detectFromPackageJson(dir);
    if (fromPkgJson) return fromPkgJson;
  }

  // Check environment
  const fromEnv = detectFromEnvironment();
  if (fromEnv) return fromEnv;

  // Default
  return DEFAULT_PACKAGE_MANAGER;
}
