import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detectMonorepo, getAppsDir, getPackagesDir, getTargetDir } from "./detect.js";

describe("detectMonorepo", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "fast-dev-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should return MonorepoContext when turbo.json found", async () => {
    await writeFile(join(tempDir, "turbo.json"), "{}");
    await writeFile(join(tempDir, "pnpm-lock.yaml"), "");

    const result = await detectMonorepo(tempDir);

    expect(result).not.toBeNull();
    expect(result?.isMonorepo).toBe(true);
    expect(result?.rootDir).toBe(tempDir);
    expect(result?.turboConfigPath).toBe(join(tempDir, "turbo.json"));
  });

  it("should walk up directories to find turbo.json", async () => {
    // Create nested structure: tempDir/apps/my-app
    const appsDir = join(tempDir, "apps");
    const appDir = join(appsDir, "my-app");
    await mkdir(appDir, { recursive: true });
    await writeFile(join(tempDir, "turbo.json"), "{}");
    await writeFile(join(tempDir, "pnpm-lock.yaml"), "");

    const result = await detectMonorepo(appDir);

    expect(result).not.toBeNull();
    expect(result?.rootDir).toBe(tempDir);
  });

  it("should return null when no turbo.json found", async () => {
    const result = await detectMonorepo(tempDir);

    expect(result).toBeNull();
  });

  it("should detect pnpm from lockfile", async () => {
    await writeFile(join(tempDir, "turbo.json"), "{}");
    await writeFile(join(tempDir, "pnpm-lock.yaml"), "");

    const result = await detectMonorepo(tempDir);

    expect(result?.packageManager).toBe("pnpm");
  });

  it("should detect yarn from lockfile", async () => {
    await writeFile(join(tempDir, "turbo.json"), "{}");
    await writeFile(join(tempDir, "yarn.lock"), "");

    const result = await detectMonorepo(tempDir);

    expect(result?.packageManager).toBe("yarn");
  });

  it("should detect npm from lockfile", async () => {
    await writeFile(join(tempDir, "turbo.json"), "{}");
    await writeFile(join(tempDir, "package-lock.json"), "{}");

    const result = await detectMonorepo(tempDir);

    expect(result?.packageManager).toBe("npm");
  });

  it("should detect bun from lockfile", async () => {
    await writeFile(join(tempDir, "turbo.json"), "{}");
    await writeFile(join(tempDir, "bun.lockb"), "");

    const result = await detectMonorepo(tempDir);

    expect(result?.packageManager).toBe("bun");
  });

  it("should detect package manager from package.json packageManager field", async () => {
    await writeFile(join(tempDir, "turbo.json"), "{}");
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({ packageManager: "yarn@4.0.0" })
    );

    const result = await detectMonorepo(tempDir);

    expect(result?.packageManager).toBe("yarn");
  });

  it("should default to pnpm when no lockfile found", async () => {
    await writeFile(join(tempDir, "turbo.json"), "{}");

    const result = await detectMonorepo(tempDir);

    expect(result?.packageManager).toBe("pnpm");
  });

  it("should find pnpm-workspace.yaml", async () => {
    await writeFile(join(tempDir, "turbo.json"), "{}");
    await writeFile(join(tempDir, "pnpm-lock.yaml"), "");
    await writeFile(join(tempDir, "pnpm-workspace.yaml"), "packages:\n  - apps/*");

    const result = await detectMonorepo(tempDir);

    expect(result?.workspaceConfigPath).toBe(join(tempDir, "pnpm-workspace.yaml"));
  });

  it("should detect baseTsconfig when tsconfig.base.json exists", async () => {
    await writeFile(join(tempDir, "turbo.json"), "{}");
    await writeFile(join(tempDir, "pnpm-lock.yaml"), "");
    await writeFile(join(tempDir, "tsconfig.base.json"), "{}");

    const result = await detectMonorepo(tempDir);

    expect(result?.baseTsconfig).toBe(join(tempDir, "tsconfig.base.json"));
  });

  it("should not set baseTsconfig when tsconfig.base.json doesn't exist", async () => {
    await writeFile(join(tempDir, "turbo.json"), "{}");
    await writeFile(join(tempDir, "pnpm-lock.yaml"), "");

    const result = await detectMonorepo(tempDir);

    expect(result?.baseTsconfig).toBeUndefined();
  });
});

describe("getAppsDir", () => {
  it("should return rootDir/apps", () => {
    expect(getAppsDir("/root")).toBe("/root/apps");
  });
});

describe("getPackagesDir", () => {
  it("should return rootDir/packages", () => {
    expect(getPackagesDir("/root")).toBe("/root/packages");
  });
});

describe("getTargetDir", () => {
  it("should return apps dir for app type", () => {
    expect(getTargetDir("/root", "app")).toBe("/root/apps");
  });

  it("should return packages dir for package type", () => {
    expect(getTargetDir("/root", "package")).toBe("/root/packages");
  });
});
