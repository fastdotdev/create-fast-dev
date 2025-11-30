import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { RegistryTemplate, TemplateRegistry } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearRegistryCache,
  fetchRemoteRegistry,
  getRemoteTemplateBySlug,
  getRemoteTemplates,
  registryTemplateToTemplate,
  searchRemoteTemplates,
} from "./registry-remote.js";

// Mock homedir to use temp directory for cache
let mockCacheDir: string;

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return {
    ...actual,
    homedir: () => mockCacheDir,
  };
});

function createMockRegistry(): TemplateRegistry {
  return {
    version: "1.0",
    templates: [
      {
        id: "nextjs-blog",
        name: "Next.js Blog",
        description: "A blog template with Next.js",
        stack: "nextjs",
        tags: ["blog", "mdx"],
        gitUrl: "github:test/nextjs-blog",
      },
      {
        id: "expo-app",
        name: "Expo App",
        description: "Mobile app with Expo",
        stack: "expo",
        tags: ["mobile", "react-native"],
        gitUrl: "github:test/expo-app",
      },
    ],
  };
}

function createMockFetch(registry: TemplateRegistry | null, shouldFail = false) {
  return vi.fn().mockImplementation(async () => {
    if (shouldFail) {
      throw new Error("Network error");
    }
    return {
      ok: true,
      json: async () => registry,
    };
  });
}

describe("registry-remote", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    mockCacheDir = await mkdtemp(join(tmpdir(), "fast-dev-cache-"));
    originalFetch = globalThis.fetch;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(mockCacheDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe("fetchRemoteRegistry", () => {
    it("should fetch and cache registry", async () => {
      const registry = createMockRegistry();
      globalThis.fetch = createMockFetch(registry);

      const result = await fetchRemoteRegistry({ refresh: true });

      expect(result).not.toBeNull();
      expect(result?.templates).toHaveLength(2);
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it("should return cached registry when valid", async () => {
      // First, populate cache
      const registry = createMockRegistry();
      globalThis.fetch = createMockFetch(registry);
      await fetchRemoteRegistry({ refresh: true });

      // Reset mock
      vi.mocked(globalThis.fetch).mockClear();

      // Second call should use cache
      const result = await fetchRemoteRegistry();

      expect(result).not.toBeNull();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("should bypass cache when refresh=true", async () => {
      // First, populate cache
      const registry = createMockRegistry();
      globalThis.fetch = createMockFetch(registry);
      await fetchRemoteRegistry({ refresh: true });

      // Reset mock
      vi.mocked(globalThis.fetch).mockClear();

      // Call with refresh
      await fetchRemoteRegistry({ refresh: true });

      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it("should return null on fetch error with no cache", async () => {
      globalThis.fetch = createMockFetch(null, true);

      const result = await fetchRemoteRegistry({ refresh: true });

      expect(result).toBeNull();
    });

    it("should return cached registry on fetch error", async () => {
      // First, populate cache
      const registry = createMockRegistry();
      globalThis.fetch = createMockFetch(registry);
      await fetchRemoteRegistry({ refresh: true });

      // Now fail fetch but cache should work
      globalThis.fetch = createMockFetch(null, true);

      const result = await fetchRemoteRegistry({ refresh: true });

      expect(result).not.toBeNull();
      expect(result?.templates).toHaveLength(2);
    });

    it("should validate registry structure", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: "structure" }),
      });

      const result = await fetchRemoteRegistry({ refresh: true });

      expect(result).toBeNull();
    });

    it("should use custom URL when provided", async () => {
      const registry = createMockRegistry();
      globalThis.fetch = createMockFetch(registry);

      await fetchRemoteRegistry({
        url: "https://custom.url/registry.json",
        refresh: true,
      });

      expect(globalThis.fetch).toHaveBeenCalledWith("https://custom.url/registry.json");
    });
  });

  describe("registryTemplateToTemplate", () => {
    it("should convert RegistryTemplate to Template", () => {
      const entry: RegistryTemplate = {
        id: "test",
        name: "Test",
        description: "Test desc",
        stack: "nextjs",
        tags: ["tag1"],
        gitUrl: "github:test/test",
      };

      const result = registryTemplateToTemplate(entry);

      expect(result.id).toBe("test");
      expect(result.slug).toBe("test");
      expect(result.name).toBe("Test");
      expect(result.stackId).toBe("nextjs");
      expect(result.gitUrl).toBe("github:test/test");
    });

    it("should set empty arrays for prompts/transforms", () => {
      const entry: RegistryTemplate = {
        id: "test",
        name: "Test",
        description: "Test desc",
        stack: "nextjs",
        tags: [],
        gitUrl: "github:test/test",
      };

      const result = registryTemplateToTemplate(entry);

      expect(result.prompts).toEqual([]);
      expect(result.transforms).toEqual([]);
    });

    it("should include branch when present", () => {
      const entry: RegistryTemplate = {
        id: "test",
        name: "Test",
        description: "Test desc",
        stack: "nextjs",
        tags: [],
        gitUrl: "github:test/test",
        branch: "develop",
      };

      const result = registryTemplateToTemplate(entry);

      expect(result.branch).toBe("develop");
    });
  });

  describe("getRemoteTemplateBySlug", () => {
    it("should return template by slug", async () => {
      const registry = createMockRegistry();
      globalThis.fetch = createMockFetch(registry);

      const result = await getRemoteTemplateBySlug("nextjs-blog", { refresh: true });

      expect(result).not.toBeNull();
      expect(result?.id).toBe("nextjs-blog");
      expect(result?.name).toBe("Next.js Blog");
    });

    it("should return null when not found", async () => {
      const registry = createMockRegistry();
      globalThis.fetch = createMockFetch(registry);

      const result = await getRemoteTemplateBySlug("non-existent", { refresh: true });

      expect(result).toBeNull();
    });

    it("should return null when registry fetch fails", async () => {
      globalThis.fetch = createMockFetch(null, true);

      const result = await getRemoteTemplateBySlug("test", { refresh: true });

      expect(result).toBeNull();
    });
  });

  describe("getRemoteTemplates", () => {
    it("should return all templates", async () => {
      const registry = createMockRegistry();
      globalThis.fetch = createMockFetch(registry);

      const result = await getRemoteTemplates({ refresh: true });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("nextjs-blog");
      expect(result[1].id).toBe("expo-app");
    });

    it("should return empty array on error", async () => {
      globalThis.fetch = createMockFetch(null, true);

      const result = await getRemoteTemplates({ refresh: true });

      expect(result).toEqual([]);
    });
  });

  describe("searchRemoteTemplates", () => {
    beforeEach(async () => {
      const registry = createMockRegistry();
      globalThis.fetch = createMockFetch(registry);
    });

    it("should filter by name", async () => {
      const result = await searchRemoteTemplates("Next.js", { refresh: true });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Next.js Blog");
    });

    it("should filter by description", async () => {
      const result = await searchRemoteTemplates("mobile", { refresh: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("expo-app");
    });

    it("should filter by tags", async () => {
      const result = await searchRemoteTemplates("mdx", { refresh: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("nextjs-blog");
    });

    it("should be case insensitive", async () => {
      const result = await searchRemoteTemplates("BLOG", { refresh: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("nextjs-blog");
    });

    it("should return empty array when no matches", async () => {
      const result = await searchRemoteTemplates("nonexistent", { refresh: true });

      expect(result).toEqual([]);
    });
  });

  describe("clearRegistryCache", () => {
    it("should remove cache file", async () => {
      // First create a cache
      const registry = createMockRegistry();
      globalThis.fetch = createMockFetch(registry);
      await fetchRemoteRegistry({ refresh: true });

      // Clear cache
      await clearRegistryCache();

      // Now fetch should be called again
      vi.mocked(globalThis.fetch).mockClear();
      await fetchRemoteRegistry();

      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it("should not throw when cache doesn't exist", async () => {
      await expect(clearRegistryCache()).resolves.not.toThrow();
    });
  });
});
