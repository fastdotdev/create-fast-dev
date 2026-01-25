import { homedir } from "node:os";

import { describe, expect, it } from "vitest";

import { expandTilde, isLocalPath } from "./fetcher.js";

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

  it("returns true for home directory paths with ~", () => {
    expect(isLocalPath("~/templates")).toBe(true);
    expect(isLocalPath("~/path/to/template")).toBe(true);
    expect(isLocalPath("~")).toBe(true);
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

describe("expandTilde", () => {
  it("expands ~ to home directory", () => {
    expect(expandTilde("~")).toBe(homedir());
  });

  it("expands ~/ paths to home directory", () => {
    expect(expandTilde("~/templates")).toBe(`${homedir()}/templates`);
    expect(expandTilde("~/path/to/template")).toBe(`${homedir()}/path/to/template`);
  });

  it("returns other paths unchanged", () => {
    expect(expandTilde("./relative")).toBe("./relative");
    expect(expandTilde("../parent")).toBe("../parent");
    expect(expandTilde("/absolute/path")).toBe("/absolute/path");
    expect(expandTilde("slug-name")).toBe("slug-name");
  });
});
