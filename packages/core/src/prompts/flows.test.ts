import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @clack/prompts to avoid interactive prompts
vi.mock("@clack/prompts", () => ({
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  select: vi.fn(),
  text: vi.fn(),
  confirm: vi.fn(),
  multiselect: vi.fn(),
}));

// Mock templates module
vi.mock("../templates/index.js", () => ({
  getAllTemplates: vi.fn(),
  getTemplatesByStack: vi.fn(),
  stacks: [],
}));

import * as p from "@clack/prompts";

import { getAllTemplates } from "../templates/index.js";
import { promptTemplateSelection } from "./flows.js";

describe("promptTemplateSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("empty templates handling", () => {
    it("should return null when no templates available", async () => {
      vi.mocked(getAllTemplates).mockReturnValue([]);

      const result = await promptTemplateSelection();

      expect(result).toBeNull();
    });

    it("should log error message when no templates", async () => {
      vi.mocked(getAllTemplates).mockReturnValue([]);

      await promptTemplateSelection();

      expect(p.log.error).toHaveBeenCalledWith("No templates available");
      expect(p.log.info).toHaveBeenCalledWith(
        "Templates need to be added to the registry before you can create a project."
      );
    });

    it("should not call p.select when no templates available", async () => {
      vi.mocked(getAllTemplates).mockReturnValue([]);

      await promptTemplateSelection();

      expect(p.select).not.toHaveBeenCalled();
    });
  });

  describe("empty stacks handling", () => {
    it("should skip stack selection when stacks array is empty", async () => {
      const mockTemplate = {
        id: "test",
        slug: "test",
        name: "Test",
        description: "Test template",
        stackId: "test",
        gitUrl: "github:test/test",
        prompts: [],
        transforms: [],
        tags: [],
      };

      vi.mocked(getAllTemplates).mockReturnValue([mockTemplate]);
      // stacks is already mocked as empty array
      vi.mocked(p.select).mockResolvedValue("test");

      await promptTemplateSelection();

      // p.select should be called once (for template selection only, not stack)
      expect(p.select).toHaveBeenCalledTimes(1);
      expect(p.select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Select a template",
        })
      );
    });

    it("should show templates directly when no stacks defined", async () => {
      const mockTemplates = [
        {
          id: "test1",
          slug: "test1",
          name: "Test 1",
          description: "Test template 1",
          stackId: "nextjs",
          gitUrl: "github:test/test1",
          prompts: [],
          transforms: [],
          tags: [],
        },
        {
          id: "test2",
          slug: "test2",
          name: "Test 2",
          description: "Test template 2",
          stackId: "expo",
          gitUrl: "github:test/test2",
          prompts: [],
          transforms: [],
          tags: [],
        },
      ];

      vi.mocked(getAllTemplates).mockReturnValue(mockTemplates);
      vi.mocked(p.select).mockResolvedValue("test1");

      const result = await promptTemplateSelection();

      expect(result).toEqual(mockTemplates[0]);
      // Verify select was called with all templates as options
      expect(p.select).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({ value: "test1" }),
            expect.objectContaining({ value: "test2" }),
          ]),
        })
      );
    });
  });
});
