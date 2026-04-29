import type { Config } from "@re-kit/core/config";
import type { FileWriter } from "@re-kit/core/file-writer";
import { parseIntent } from "@re-kit/core/parse-intent";
import type { Strategy } from "@re-kit/core/strategy";
import { describe, expect, it } from "vitest";
import { runAdd } from "./add.js";

const stubStrategy: Strategy = {
  name: "stub",
  readVersion: async () => "0.0.0",
  writeVersion: async () => {},
};

const config: Config = {
  intentsDir: ".changes",
  packages: [
    { name: "api", path: "packages/api", strategy: stubStrategy },
    { name: "web", path: "packages/web", strategy: stubStrategy },
  ],
};

const makeWriter = (files: Record<string, string>): FileWriter => ({
  writeFile: async (path, content) => {
    files[path] = content;
  },
  deleteFile: async (path) => {
    delete files[path];
  },
});

describe("runAdd", () => {
  it("writes a parseable intent file at intentsDir/<id>.md", async () => {
    const files: Record<string, string> = {};
    const result = await runAdd(
      config,
      { writer: makeWriter(files), generateId: () => "abc123" },
      { package: "api", bump: "minor", summary: "Add support for X" },
    );

    expect(result).toEqual({ id: "abc123", path: ".changes/abc123.md" });
    const written = files[".changes/abc123.md"];
    expect(written).toBeDefined();
    const parsed = parseIntent(written ?? "", "abc123");
    expect(parsed).toEqual({
      id: "abc123",
      package: "api",
      bump: "minor",
      hotfix: false,
      summary: "Add support for X",
    });
  });

  it("writes the hotfix flag when requested", async () => {
    const files: Record<string, string> = {};
    await runAdd(
      config,
      { writer: makeWriter(files), generateId: () => "x" },
      { package: "api", bump: "patch", summary: "fix", hotfix: true },
    );
    expect(files[".changes/x.md"]).toContain("hotfix: true");
  });

  it("rejects an unknown package with the configured names listed", async () => {
    await expect(
      runAdd(
        config,
        { writer: makeWriter({}), generateId: () => "x" },
        { package: "ghost", bump: "patch", summary: "x" },
      ),
    ).rejects.toThrow("Unknown package: ghost. Configured packages: api, web");
  });

  it("rejects an invalid bump", async () => {
    await expect(
      runAdd(
        config,
        { writer: makeWriter({}), generateId: () => "x" },
        { package: "api", bump: "huge", summary: "x" },
      ),
    ).rejects.toThrow("Invalid bump: huge");
  });

  it("rejects an empty summary", async () => {
    await expect(
      runAdd(
        config,
        { writer: makeWriter({}), generateId: () => "x" },
        { package: "api", bump: "patch", summary: "   " },
      ),
    ).rejects.toThrow("Intent summary cannot be empty");
  });
});
