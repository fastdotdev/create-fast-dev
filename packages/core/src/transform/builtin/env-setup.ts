import { access, constants, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { TransformContext, Transformer } from "@repo/shared";

/**
 * Copies .env.example to .env and optionally substitutes values
 */
export const envSetupTransformer: Transformer = {
  name: "env-setup",
  description: "Creates .env from .env.example with variable substitution",

  async transform(
    ctx: TransformContext,
    options?: Record<string, unknown>
  ): Promise<void> {
    const examplePath = join(ctx.projectPath, ".env.example");
    const envPath = join(ctx.projectPath, ".env");

    // Check if .env.example exists
    try {
      await access(examplePath, constants.R_OK);
    } catch {
      // No .env.example, nothing to do
      return;
    }

    let content = await readFile(examplePath, "utf-8");

    // Get substitutions from options or context
    const substitutions: Record<string, string> = {
      ...(options?.["substitutions"] as Record<string, string> | undefined),
    };

    // Add common substitutions from answers
    if (ctx.projectName) {
      substitutions["PROJECT_NAME"] = ctx.projectName;
      substitutions["APP_NAME"] = ctx.projectName;
    }

    // Perform substitutions
    // Supports formats: ${VAR_NAME} or $VAR_NAME
    for (const [key, value] of Object.entries(substitutions)) {
      const patterns = [
        new RegExp(`\\$\\{${key}\\}`, "g"),
        new RegExp(`\\$${key}(?![A-Z_])`, "g"),
      ];

      for (const pattern of patterns) {
        content = content.replace(pattern, value);
      }
    }

    await writeFile(envPath, content, "utf-8");
  },
};
