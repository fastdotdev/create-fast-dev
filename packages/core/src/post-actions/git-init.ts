import { rm } from "node:fs/promises";
import { join } from "node:path";

import { execa } from "execa";

interface GitInitOptions {
  /** Target directory */
  dir: string;
  /** Initial commit message */
  commitMessage?: string;
  /** Show output in terminal */
  stdio?: "inherit" | "pipe" | "ignore";
}

interface GitInitResult {
  /** Whether initialization succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Check if git is available
 */
async function isGitAvailable(): Promise<boolean> {
  try {
    await execa("git", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize a git repository
 */
export async function initializeGit(options: GitInitOptions): Promise<GitInitResult> {
  const {
    dir,
    commitMessage = "Initial commit from create-fast-dev",
    stdio = "pipe",
  } = options;

  // Check if git is available
  if (!(await isGitAvailable())) {
    return {
      success: false,
      error: "Git is not installed or not in PATH",
    };
  }

  try {
    // Remove any existing .git directory (from template)
    await rm(join(dir, ".git"), { recursive: true, force: true });

    // Initialize new repo
    await execa("git", ["init"], { cwd: dir, stdio });

    // Add all files
    await execa("git", ["add", "-A"], { cwd: dir, stdio });

    // Create initial commit
    await execa("git", ["commit", "-m", commitMessage], { cwd: dir, stdio });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
