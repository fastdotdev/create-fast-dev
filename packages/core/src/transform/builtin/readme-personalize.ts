import { access, constants, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { TransformContext, Transformer } from "@repo/shared";

/**
 * Personalizes the README.md with project-specific information
 */
export const readmePersonalizeTransformer: Transformer = {
  name: "readme-personalize",
  description: "Updates README.md with project name and description",

  async transform(ctx: TransformContext): Promise<void> {
    const readmePath = join(ctx.projectPath, "README.md");

    // Check if README exists
    try {
      await access(readmePath, constants.R_OK);
    } catch {
      return;
    }

    let content = await readFile(readmePath, "utf-8");

    // Replace template placeholders
    const replacements: Record<string, string> = {
      "{{PROJECT_NAME}}": ctx.projectName,
      "{{DESCRIPTION}}": (ctx.answers["description"] as string) ?? "",
      // Title case project name for headings
      "{{PROJECT_TITLE}}": ctx.projectName
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replaceAll(placeholder, value);
    }

    // Also replace the first H1 heading if it looks like a template name
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match?.[1]) {
      const originalTitle = h1Match[1];
      // If the title contains "starter", "template", etc., replace it
      if (/starter|template|boilerplate/i.test(originalTitle)) {
        content = content.replace(h1Match[0], `# ${replacements["{{PROJECT_TITLE}}"]}`);
      }
    }

    await writeFile(readmePath, content, "utf-8");
  },
};
