import type { TemplateStack } from "@repo/shared";

/**
 * Get a stack by ID
 */
export function getStackById(id: string): TemplateStack | undefined {
  return stacks.find((s) => s.id === id);
}

/**
 * Template stacks available in the CLI
 * Can be framework-based (nextjs, expo) or use-case-based (cli, library)
 */
export const stacks: TemplateStack[] = [];
