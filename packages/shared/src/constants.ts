/**
 * CLI metadata
 */
export const CLI_NAME = "create-fast-dev";
export const CLI_VERSION = "0.0.1";

/**
 * Config paths
 */
export const CONFIG_DIR_NAME = "fast-dev";
export const CONFIG_FILE_NAME = "config.json";
export const LOG_DIR_NAME = "logs";

/**
 * Default values
 */
export const DEFAULT_BRANCH = "main";
export const DEFAULT_PACKAGE_MANAGER = "pnpm" as const;

/**
 * Exit codes
 */
export const EXIT_CODE = {
  SUCCESS: 0,
  ERROR: 1,
  CANCELLED: 130,
} as const;

/**
 * Validation patterns
 */
export const VALIDATION = {
  PROJECT_NAME: /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

/**
 * Template stacks - framework-based or use-case-based groupings
 */
export const STACKS = {
  NEXTJS: "nextjs",
  EXPO: "expo",
  HONO: "hono",
  CLI: "cli",
  LIBRARY: "library",
  MONOREPO: "monorepo",
} as const;
