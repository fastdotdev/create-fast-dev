import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";

import type { TransformContext, Transformer } from "@repo/shared";

interface ToggleFeatureOptions {
  /** Key in answers that contains selected features */
  featureKey: string;
  /** Mapping of feature names to directories/files to remove if NOT selected */
  featureMap?: Record<string, string[]>;
}

/**
 * Removes files/directories for features that were not selected.
 *
 * Templates should include a `.fast-dev/features.json` file that maps
 * feature names to paths to remove if the feature is not selected.
 *
 * Example features.json:
 * {
 *   "auth": ["src/features/auth", "src/middleware/auth.ts"],
 *   "analytics": ["src/lib/analytics.ts", "src/providers/analytics.tsx"]
 * }
 */
export const toggleFeatureTransformer: Transformer = {
  name: "toggle-feature",
  description: "Removes files for unselected features",

  async transform(
    ctx: TransformContext,
    options?: Record<string, unknown>
  ): Promise<void> {
    const opts = options as ToggleFeatureOptions | undefined;
    const featureKey = opts?.featureKey ?? "features";

    // Get selected features from answers
    const selectedFeatures = (ctx.answers[featureKey] as string[]) ?? [];
    const selectedSet = new Set(selectedFeatures);

    // Try to load feature map from template
    let featureMap: Record<string, string[]> = opts?.featureMap ?? {};

    const featureConfigPath = join(ctx.projectPath, ".fast-dev", "features.json");
    try {
      const configContent = await readFile(featureConfigPath, "utf-8");
      featureMap = { ...featureMap, ...JSON.parse(configContent) };
    } catch {
      // No features.json, use only options-provided map
    }

    // Remove paths for unselected features
    for (const [feature, paths] of Object.entries(featureMap)) {
      if (selectedSet.has(feature)) {
        // Feature is selected, keep the files
        continue;
      }

      // Feature not selected, remove associated paths
      for (const relativePath of paths) {
        const fullPath = join(ctx.projectPath, relativePath);
        try {
          await rm(fullPath, { recursive: true, force: true });
        } catch {
          // Path doesn't exist, ignore
        }
      }
    }

    // Clean up .fast-dev directory if it exists
    try {
      await rm(join(ctx.projectPath, ".fast-dev"), { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, ignore
    }
  },
};
