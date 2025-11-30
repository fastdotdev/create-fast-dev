import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { RegistryTemplate, Template, TemplateRegistry } from "@repo/shared";
import { CONFIG_DIR_NAME } from "@repo/shared";

/**
 * Default remote registry URL
 * This can be a GitHub raw URL, CDN, or any JSON endpoint
 */
const DEFAULT_REGISTRY_URL =
  "https://raw.githubusercontent.com/fastdotdev/create-fast-dev/main/registry.json";

/**
 * Cache settings
 */
const CACHE_FILE = "registry-cache.json";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CachedRegistry {
  fetchedAt: number;
  registry: TemplateRegistry;
}

/**
 * Get the cache file path
 */
function getCachePath(): string {
  return join(homedir(), ".config", CONFIG_DIR_NAME, CACHE_FILE);
}

/**
 * Check if cache is valid
 */
async function isCacheValid(): Promise<boolean> {
  try {
    const cachePath = getCachePath();
    const stats = await stat(cachePath);
    const age = Date.now() - stats.mtimeMs;
    return age < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Read cached registry
 */
async function readCache(): Promise<CachedRegistry | null> {
  try {
    const cachePath = getCachePath();
    const content = await readFile(cachePath, "utf-8");
    return JSON.parse(content) as CachedRegistry;
  } catch {
    return null;
  }
}

/**
 * Write registry to cache
 */
async function writeCache(registry: TemplateRegistry): Promise<void> {
  try {
    const cachePath = getCachePath();
    await mkdir(dirname(cachePath), { recursive: true });
    const cached: CachedRegistry = {
      fetchedAt: Date.now(),
      registry,
    };
    await writeFile(cachePath, JSON.stringify(cached, null, 2), "utf-8");
  } catch {
    // Cache write failed, ignore
  }
}

/**
 * Fetch remote template registry
 */
export async function fetchRemoteRegistry(options?: {
  /** Custom registry URL */
  url?: string;
  /** Force refresh, ignoring cache */
  refresh?: boolean;
}): Promise<TemplateRegistry | null> {
  const { url = DEFAULT_REGISTRY_URL, refresh = false } = options ?? {};

  // Check cache first (unless refresh is forced)
  if (!refresh && (await isCacheValid())) {
    const cached = await readCache();
    if (cached) {
      return cached.registry;
    }
  }

  // Fetch from remote
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const registry = (await response.json()) as TemplateRegistry;

    // Validate structure
    if (!registry.version || !Array.isArray(registry.templates)) {
      throw new Error("Invalid registry format");
    }

    // Cache the result
    await writeCache(registry);

    return registry;
  } catch {
    // If fetch fails and we have a cache (even if expired), use it
    const cached = await readCache();
    if (cached) {
      return cached.registry;
    }
    return null;
  }
}

/**
 * Convert a registry template to a full Template object
 */
export function registryTemplateToTemplate(entry: RegistryTemplate): Template {
  return {
    id: entry.id,
    slug: entry.id,
    name: entry.name,
    description: entry.description,
    stackId: entry.stack,
    gitUrl: entry.gitUrl,
    branch: entry.branch,
    prompts: [], // Will be loaded from fast-dev.config.json after cloning
    transforms: [], // Will be loaded from fast-dev.config.json after cloning
    tags: entry.tags,
  };
}

/**
 * Get a template from the remote registry by ID/slug
 */
export async function getRemoteTemplateBySlug(
  slug: string,
  options?: { url?: string; refresh?: boolean }
): Promise<Template | null> {
  const registry = await fetchRemoteRegistry(options);
  if (!registry) {
    return null;
  }

  const entry = registry.templates.find((t) => t.id === slug);
  if (!entry) {
    return null;
  }

  return registryTemplateToTemplate(entry);
}

/**
 * Get all templates from the remote registry
 */
export async function getRemoteTemplates(options?: {
  url?: string;
  refresh?: boolean;
}): Promise<Template[]> {
  const registry = await fetchRemoteRegistry(options);
  if (!registry) {
    return [];
  }

  return registry.templates.map(registryTemplateToTemplate);
}

/**
 * Search remote templates by query
 */
export async function searchRemoteTemplates(
  query: string,
  options?: { url?: string; refresh?: boolean }
): Promise<Template[]> {
  const templates = await getRemoteTemplates(options);
  const lowerQuery = query.toLowerCase();

  return templates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Clear the registry cache
 */
export async function clearRegistryCache(): Promise<void> {
  const { rm } = await import("node:fs/promises");
  try {
    await rm(getCachePath(), { force: true });
  } catch {
    // Cache doesn't exist, ignore
  }
}
