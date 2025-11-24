import { getAllTemplates, getTemplatesByStack, stacks } from "@repo/core";
import { defineCommand } from "citty";
import pc from "picocolors";

export const listCommand = defineCommand({
  meta: {
    name: "list",
    description: "List available templates",
  },
  args: {
    stack: {
      type: "string",
      alias: "s",
      description: "Filter by stack (nextjs, expo, hono, cli, library, monorepo)",
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  run({ args }) {
    const templates = args.stack ? getTemplatesByStack(args.stack) : getAllTemplates();

    if (args.json) {
      console.log(JSON.stringify(templates, null, 2));
      return;
    }

    if (templates.length === 0) {
      console.log(pc.yellow("No templates found"));
      if (args.stack) {
        console.log(
          pc.dim(
            `Try without --stack or use one of: ${stacks.map((s) => s.id).join(", ")}`
          )
        );
      }
      return;
    }

    console.log(pc.bold("\nAvailable Templates\n"));

    // Group by stack
    const grouped = new Map<string, typeof templates>();

    for (const template of templates) {
      const existing = grouped.get(template.stackId) ?? [];
      grouped.set(template.stackId, [...existing, template]);
    }

    for (const stack of stacks) {
      const stackTemplates = grouped.get(stack.id);
      if (!stackTemplates?.length) continue;

      console.log(pc.cyan(pc.bold(stack.name)));
      console.log(pc.dim(`  ${stack.description}`));
      console.log();

      for (const template of stackTemplates) {
        console.log(`  ${pc.green(template.slug)}`);
        console.log(`    ${pc.dim(template.description)}`);
        if (template.tags.length) {
          console.log(`    ${pc.dim(`Tags: ${template.tags.join(", ")}`)}`);
        }
        console.log();
      }
    }

    console.log(pc.dim("Use: npx create-fast-dev --template=<slug>"));
    console.log();
  },
});
