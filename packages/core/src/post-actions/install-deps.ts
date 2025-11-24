import type { PackageManager } from "@repo/shared";
import { execa } from "execa";

import { detectPackageManager } from "./detect-package-manager.js";

interface InstallOptions {
  /** Target directory */
  dir: string;
  /** Preferred package manager (overrides detection) */
  packageManager?: PackageManager;
  /** Show output in terminal */
  stdio?: "inherit" | "pipe" | "ignore";
}

interface InstallResult {
  /** Package manager used */
  packageManager: PackageManager;
  /** Whether installation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Get the install command for a package manager
 */
function getInstallCommand(pm: PackageManager): [string, string[]] {
  const commands: Record<PackageManager, [string, string[]]> = {
    npm: ["npm", ["install"]],
    yarn: ["yarn", ["install"]],
    pnpm: ["pnpm", ["install"]],
    bun: ["bun", ["install"]],
  };
  return commands[pm];
}

/**
 * Install dependencies in a directory
 */
export async function installDependencies(
  options: InstallOptions
): Promise<InstallResult> {
  const pm = options.packageManager ?? (await detectPackageManager(options.dir));
  const [cmd, args] = getInstallCommand(pm);

  try {
    await execa(cmd, args, {
      cwd: options.dir,
      stdio: options.stdio ?? "inherit",
    });

    return {
      packageManager: pm,
      success: true,
    };
  } catch (error) {
    return {
      packageManager: pm,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
