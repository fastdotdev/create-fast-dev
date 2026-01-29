/**
 * Directories to exclude when copying local templates
 */
export const EXCLUDED_DIRS = [
  "node_modules",
  ".git",
  "dist",
  ".turbo",
  ".next",
  ".nuxt",
  ".claude",
  "test-ledger",
  ".cache",
  ".output",
  "coverage",
] as const;

/**
 * Files to include even if they match exclusion patterns (e.g., env files)
 */
export const INCLUDED_FILES = [".env.example", "example.env"] as const;
