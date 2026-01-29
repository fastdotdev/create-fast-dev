import { cp } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join } from "node:path";

import type { Template } from "@repo/shared";
import { DEFAULT_BRANCH } from "@repo/shared";
import { downloadTemplate } from "giget";

import { EXCLUDED_DIRS, INCLUDED_FILES } from "../constants/copy-filter.js";

/**
 * Check if a template argument is a local file path
 */
export function isLocalPath(templateArg: string): boolean {
  return (
    templateArg.startsWith("./") ||
    templateArg.startsWith("../") ||
    templateArg.startsWith("~/") ||
    templateArg === "~" ||
    isAbsolute(templateArg)
  );
}

/**
 * Expand ~ to the user's home directory
 */
export function expandTilde(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

const excludedDirs = new Set<string>(EXCLUDED_DIRS);
const includedFiles = new Set<string>(INCLUDED_FILES);

// Check if a file should be excluded from copying
function isExcluded(name: string): boolean {
  const lower = name.toLowerCase();
  if (excludedDirs.has(name)) return true;
  if (includedFiles.has(lower)) return false;
  return lower === ".env" || lower.startsWith(".env.");
}

/**
 * Copy a local template directory to the destination
 */
export async function copyLocalTemplate(source: string, dest: string): Promise<void> {
  await cp(source, dest, {
    recursive: true,
    filter: (src) => !isExcluded(basename(src)),
  });
}

export interface FetchOptions {
  /** Target directory for the template */
  dir: string;
  /** Force overwrite if directory exists */
  force?: boolean;
  /** Prefer offline cached version */
  offline?: boolean;
}

export interface FetchResult {
  /** Directory where template was extracted */
  dir: string;
  /** Source URL used */
  source: string;
}

/**
 * Download a template from its git repository
 */
export async function fetchTemplate(
  template: Template,
  options: FetchOptions
): Promise<FetchResult> {
  const source = template.branch
    ? `${template.gitUrl}#${template.branch}`
    : `${template.gitUrl}#${DEFAULT_BRANCH}`;

  const result = await downloadTemplate(source, {
    dir: options.dir,
    force: options.force,
    offline: options.offline,
    preferOffline: options.offline,
  });

  return {
    dir: result.dir,
    source: result.source,
  };
}

/**
 * Check if a template can be fetched (validates URL format)
 */
export function validateTemplateUrl(gitUrl: string): boolean {
  // giget supports: github:, gitlab:, bitbucket:, sourcehut:
  const validPrefixes = ["github:"];
  return validPrefixes.some((prefix) => gitUrl.startsWith(prefix));
}
