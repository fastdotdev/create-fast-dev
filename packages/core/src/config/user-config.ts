import type { UserConfig } from "@repo/shared";
import { CONFIG_DIR_NAME, DEFAULT_PACKAGE_MANAGER } from "@repo/shared";
import Conf from "conf";

/**
 * Schema for user configuration validation
 */
const schema = {
  author: {
    type: "string" as const,
  },
  email: {
    type: "string" as const,
  },
  preferredPackageManager: {
    type: "string" as const,
    enum: ["npm", "yarn", "pnpm", "bun"],
    default: DEFAULT_PACKAGE_MANAGER,
  },
  defaultGitInit: {
    type: "boolean" as const,
    default: true,
  },
  defaultInstallDeps: {
    type: "boolean" as const,
    default: true,
  },
};

/**
 * User configuration store
 */
let configInstance: Conf<UserConfig> | null = null;

/**
 * Get the configuration store instance
 */
export function getConfigStore(): Conf<UserConfig> {
  if (!configInstance) {
    configInstance = new Conf<UserConfig>({
      projectName: CONFIG_DIR_NAME,
      schema,
      defaults: {
        preferredPackageManager: DEFAULT_PACKAGE_MANAGER,
        defaultGitInit: true,
        defaultInstallDeps: true,
      },
    });
  }
  return configInstance;
}

/**
 * Get a configuration value
 */
export function getConfig<K extends keyof UserConfig>(key: K): UserConfig[K] {
  return getConfigStore().get(key);
}

/**
 * Set a configuration value
 */
export function setConfig<K extends keyof UserConfig>(
  key: K,
  value: UserConfig[K]
): void {
  getConfigStore().set(key, value);
}

/**
 * Get all configuration values
 */
export function getAllConfig(): UserConfig {
  return getConfigStore().store;
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  getConfigStore().clear();
}

/**
 * Delete a specific configuration key
 */
export function deleteConfig(key: keyof UserConfig): void {
  getConfigStore().delete(key);
}

/**
 * Get the path to the configuration file
 */
export function getConfigPath(): string {
  return getConfigStore().path;
}
