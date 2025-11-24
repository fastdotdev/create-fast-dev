import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  detectFromEnvironment,
  detectFromLockfile,
  detectFromPackageJson,
  detectPackageManager,
} from "./detect-package-manager.js";

describe("detect-package-manager", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "fast-dev-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("detectFromLockfile", () => {
    it("should detect pnpm from pnpm-lock.yaml", async () => {
      await writeFile(join(tempDir, "pnpm-lock.yaml"), "");
      expect(await detectFromLockfile(tempDir)).toBe("pnpm");
    });

    it("should detect yarn from yarn.lock", async () => {
      await writeFile(join(tempDir, "yarn.lock"), "");
      expect(await detectFromLockfile(tempDir)).toBe("yarn");
    });

    it("should detect npm from package-lock.json", async () => {
      await writeFile(join(tempDir, "package-lock.json"), "{}");
      expect(await detectFromLockfile(tempDir)).toBe("npm");
    });

    it("should detect bun from bun.lockb", async () => {
      await writeFile(join(tempDir, "bun.lockb"), "");
      expect(await detectFromLockfile(tempDir)).toBe("bun");
    });

    it("should return null if no lockfile found", async () => {
      expect(await detectFromLockfile(tempDir)).toBeNull();
    });
  });

  describe("detectFromPackageJson", () => {
    it("should detect from packageManager field", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ packageManager: "pnpm@8.0.0" })
      );
      expect(await detectFromPackageJson(tempDir)).toBe("pnpm");
    });

    it("should return null if no packageManager field", async () => {
      await writeFile(join(tempDir, "package.json"), JSON.stringify({}));
      expect(await detectFromPackageJson(tempDir)).toBeNull();
    });

    it("should return null if no package.json", async () => {
      expect(await detectFromPackageJson(tempDir)).toBeNull();
    });
  });

  describe("detectFromEnvironment", () => {
    const originalEnv = process.env["npm_config_user_agent"];

    afterEach(() => {
      if (originalEnv) {
        process.env["npm_config_user_agent"] = originalEnv;
      } else {
        delete process.env["npm_config_user_agent"];
      }
    });

    it("should detect pnpm from user agent", () => {
      process.env["npm_config_user_agent"] = "pnpm/8.0.0";
      expect(detectFromEnvironment()).toBe("pnpm");
    });

    it("should detect yarn from user agent", () => {
      process.env["npm_config_user_agent"] = "yarn/3.0.0";
      expect(detectFromEnvironment()).toBe("yarn");
    });

    it("should return null if no user agent", () => {
      delete process.env["npm_config_user_agent"];
      expect(detectFromEnvironment()).toBeNull();
    });
  });

  describe("detectPackageManager", () => {
    it("should default to pnpm", async () => {
      delete process.env["npm_config_user_agent"];
      expect(await detectPackageManager(tempDir)).toBe("pnpm");
    });

    it("should prioritize lockfile over environment", async () => {
      process.env["npm_config_user_agent"] = "npm/10.0.0";
      await writeFile(join(tempDir, "yarn.lock"), "");
      expect(await detectPackageManager(tempDir)).toBe("yarn");
    });
  });
});
