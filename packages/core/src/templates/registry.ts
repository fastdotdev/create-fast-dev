import type { Template } from "@repo/shared";

import { templates } from "./stacks/index.js";

// Re-export templates for backward compatibility
export { templates };

/**
 * Get all templates
 */
export function getAllTemplates(): Template[] {
  return templates;
}

/**
 * Get a template by slug
 */
export function getTemplateBySlug(slug: string): Template | undefined {
  return templates.find((t) => t.slug === slug);
}

/**
 * Get templates by stack
 */
export function getTemplatesByStack(stackId: string): Template[] {
  return templates.filter((t) => t.stackId === stackId);
}

/**
 * Search templates by query (matches name, description, or tags)
 */
export function searchTemplates(query: string): Template[] {
  const q = query.toLowerCase();
  return templates.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}
