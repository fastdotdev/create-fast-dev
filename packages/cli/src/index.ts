#!/usr/bin/env node
import { CLI_NAME, CLI_VERSION } from "@repo/shared";
import { defineCommand, runMain } from "citty";

import { configCommand } from "./commands/config.js";
import { createCommand } from "./commands/create.js";
import { listCommand } from "./commands/list.js";

const main = defineCommand({
  meta: {
    name: CLI_NAME,
    version: CLI_VERSION,
    description: "Scaffold fast-dev template projects",
  },
  subCommands: {
    create: createCommand,
    list: listCommand,
    config: configCommand,
  },
});

// Handle running without subcommand - default to create
const args = process.argv.slice(2);
const firstArg = args[0];
const subCommands = ["create", "list", "config", "--help", "-h", "--version", "-v"];

if (
  !firstArg ||
  !subCommands.some((cmd) => firstArg === cmd || firstArg.startsWith(cmd + " "))
) {
  // No subcommand specified, run create
  process.argv.splice(2, 0, "create");
}

runMain(main);
