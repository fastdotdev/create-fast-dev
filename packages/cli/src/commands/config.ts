import {
  deleteConfig,
  getAllConfig,
  getConfig,
  getConfigPath,
  resetConfig,
  setConfig,
} from "@repo/core";
import type { PackageManager, UserConfig } from "@repo/shared";
import { defineCommand } from "citty";
import pc from "picocolors";

const VALID_KEYS: (keyof UserConfig)[] = [
  "author",
  "email",
  "preferredPackageManager",
  "defaultGitInit",
  "defaultInstallDeps",
];

const VALID_PACKAGE_MANAGERS: PackageManager[] = ["npm", "yarn", "pnpm", "bun"];

export const configCommand = defineCommand({
  meta: {
    name: "config",
    description: "Manage user configuration",
  },
  subCommands: {
    get: defineCommand({
      meta: {
        name: "get",
        description: "Get a configuration value",
      },
      args: {
        key: {
          type: "positional",
          description: "Configuration key to get",
          required: true,
        },
      },
      run({ args }) {
        const key = args.key as keyof UserConfig;

        if (!VALID_KEYS.includes(key)) {
          console.log(pc.red(`Unknown config key: ${key}`));
          console.log(pc.dim(`Valid keys: ${VALID_KEYS.join(", ")}`));
          process.exit(1);
        }

        const value = getConfig(key);
        if (value === undefined) {
          console.log(pc.dim("(not set)"));
        } else {
          console.log(String(value));
        }
      },
    }),

    set: defineCommand({
      meta: {
        name: "set",
        description: "Set a configuration value",
      },
      args: {
        key: {
          type: "positional",
          description: "Configuration key to set",
          required: true,
        },
        value: {
          type: "positional",
          description: "Value to set",
          required: true,
        },
      },
      run({ args }) {
        const key = args.key as keyof UserConfig;
        const rawValue = args.value as string;

        if (!VALID_KEYS.includes(key)) {
          console.log(pc.red(`Unknown config key: ${key}`));
          console.log(pc.dim(`Valid keys: ${VALID_KEYS.join(", ")}`));
          process.exit(1);
        }

        // Parse value based on key type
        let value: string | boolean;

        if (key === "defaultGitInit" || key === "defaultInstallDeps") {
          value = rawValue === "true" || rawValue === "1" || rawValue === "yes";
        } else if (key === "preferredPackageManager") {
          if (!VALID_PACKAGE_MANAGERS.includes(rawValue as PackageManager)) {
            console.log(pc.red(`Invalid package manager: ${rawValue}`));
            console.log(pc.dim(`Valid options: ${VALID_PACKAGE_MANAGERS.join(", ")}`));
            process.exit(1);
          }
          value = rawValue;
        } else {
          value = rawValue;
        }

        setConfig(key, value as UserConfig[typeof key]);
        console.log(pc.green(`Set ${key} = ${value}`));
      },
    }),

    list: defineCommand({
      meta: {
        name: "list",
        description: "List all configuration values",
      },
      args: {
        json: {
          type: "boolean",
          description: "Output as JSON",
          default: false,
        },
      },
      run({ args }) {
        const config = getAllConfig();

        if (args.json) {
          console.log(JSON.stringify(config, null, 2));
          return;
        }

        console.log(pc.bold("\nConfiguration\n"));
        console.log(pc.dim(`Path: ${getConfigPath()}\n`));

        for (const key of VALID_KEYS) {
          const value = config[key];
          const displayValue = value === undefined ? pc.dim("(not set)") : String(value);
          console.log(`  ${pc.cyan(key)}: ${displayValue}`);
        }

        console.log();
      },
    }),

    delete: defineCommand({
      meta: {
        name: "delete",
        description: "Delete a configuration value",
      },
      args: {
        key: {
          type: "positional",
          description: "Configuration key to delete",
          required: true,
        },
      },
      run({ args }) {
        const key = args.key as keyof UserConfig;

        if (!VALID_KEYS.includes(key)) {
          console.log(pc.red(`Unknown config key: ${key}`));
          console.log(pc.dim(`Valid keys: ${VALID_KEYS.join(", ")}`));
          process.exit(1);
        }

        deleteConfig(key);
        console.log(pc.green(`Deleted ${key}`));
      },
    }),

    reset: defineCommand({
      meta: {
        name: "reset",
        description: "Reset all configuration to defaults",
      },
      run() {
        resetConfig();
        console.log(pc.green("Configuration reset to defaults"));
      },
    }),

    path: defineCommand({
      meta: {
        name: "path",
        description: "Show the configuration file path",
      },
      run() {
        console.log(getConfigPath());
      },
    }),
  },
});
