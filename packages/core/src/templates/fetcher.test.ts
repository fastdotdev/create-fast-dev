import { describe, expect, it } from "vitest";

import { isLocalPath } from "./fetcher.js";

describe("isLocalPath", () => {
  it("returns true for relative paths starting with ./", () => {
    expect(isLocalPath("./my-template")).toBe(true);
    expect(isLocalPath("./path/to/template")).toBe(true);
  });

  it("returns true for relative paths starting with ../", () => {
    expect(isLocalPath("../my-template")).toBe(true);
    expect(isLocalPath("../../path/to/template")).toBe(true);
  });

  it("returns true for absolute paths", () => {
    expect(isLocalPath("/absolute/path")).toBe(true);
    expect(isLocalPath("/home/user/templates/my-template")).toBe(true);
  });

  it("returns false for template slugs", () => {
    expect(isLocalPath("nextjs-starter")).toBe(false);
    expect(isLocalPath("expo-starter")).toBe(false);
    expect(isLocalPath("my-template")).toBe(false);
  });

  it("returns false for git URLs", () => {
    expect(isLocalPath("github:user/repo")).toBe(false);
    expect(isLocalPath("gitlab:user/repo")).toBe(false);
  });
});
