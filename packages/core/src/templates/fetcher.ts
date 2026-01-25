import { cp } from "node:fs/promises";
import { isAbsolute } from "node:path";

import type { Template } from "@repo/shared";
import { DEFAULT_BRANCH } from "@repo/shared";
import { downloadTemplate } from "giget";

/**
 * Check if a template argument is a local file path
 */
export function isLocalPath(templateArg: string): boolean {
  return (
    templateArg.startsWith("./") ||
    templateArg.startsWith("../") ||
    isAbsolute(templateArg)
  );
}

/**
 * Copy a local template directory to the destination
 */
export async function copyLocalTemplate(source: string, dest: string): Promise<void> {
  await cp(source, dest, { recursive: true });
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
