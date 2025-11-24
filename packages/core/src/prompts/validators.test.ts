import { describe, expect, it } from "vitest";

import {
  createValidator,
  validateEmail,
  validateProjectName,
  validateRequired,
} from "./validators.js";

describe("validators", () => {
  describe("validateProjectName", () => {
    it("should accept valid names", () => {
      expect(validateProjectName("my-project")).toBeUndefined();
      expect(validateProjectName("app123")).toBeUndefined();
      expect(validateProjectName("a")).toBeUndefined();
      expect(validateProjectName("test-app-v2")).toBeUndefined();
    });

    it("should reject empty names", () => {
      expect(validateProjectName("")).toBeDefined();
      expect(validateProjectName("   ")).toBeDefined();
    });

    it("should reject uppercase names", () => {
      expect(validateProjectName("MyProject")).toBeDefined();
      expect(validateProjectName("TEST")).toBeDefined();
    });

    it("should reject names with invalid characters", () => {
      expect(validateProjectName("my_project")).toBeDefined();
      expect(validateProjectName("my project")).toBeDefined();
      expect(validateProjectName("my.project")).toBeDefined();
    });

    it("should reject names starting/ending with dash", () => {
      expect(validateProjectName("-myproject")).toBeDefined();
      expect(validateProjectName("myproject-")).toBeDefined();
    });
  });

  describe("validateEmail", () => {
    it("should accept valid emails", () => {
      expect(validateEmail("test@example.com")).toBeUndefined();
      expect(validateEmail("user.name@domain.co.uk")).toBeUndefined();
    });

    it("should accept empty values (optional)", () => {
      expect(validateEmail("")).toBeUndefined();
      expect(validateEmail("   ")).toBeUndefined();
    });

    it("should reject invalid emails", () => {
      expect(validateEmail("invalid")).toBeDefined();
      expect(validateEmail("test@")).toBeDefined();
      expect(validateEmail("@domain.com")).toBeDefined();
    });
  });

  describe("validateRequired", () => {
    it("should accept non-empty values", () => {
      expect(validateRequired("test")).toBeUndefined();
      expect(validateRequired("  test  ")).toBeUndefined();
    });

    it("should reject empty values", () => {
      expect(validateRequired("")).toBeDefined();
      expect(validateRequired("   ")).toBeDefined();
    });
  });

  describe("createValidator", () => {
    it("should return undefined for no validate function", () => {
      expect(createValidator(undefined)).toBeUndefined();
    });

    it("should wrap boolean-returning validators", () => {
      const validator = createValidator((v) => (v as string).length > 3);
      expect(validator?.("test")).toBeUndefined();
      expect(validator?.("ab")).toBeDefined();
    });

    it("should wrap string-returning validators", () => {
      const validator = createValidator((v) =>
        (v as string).length > 3 ? true : "Too short"
      );
      expect(validator?.("test")).toBeUndefined();
      expect(validator?.("ab")).toBe("Too short");
    });
  });
});
