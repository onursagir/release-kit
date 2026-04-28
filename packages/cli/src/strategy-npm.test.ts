import type { FileReader } from "@release-kit/core/file-reader";
import { describe, expect, it } from "vitest";
import { npm } from "./strategy-npm.js";

const fakeReader = (files: Record<string, string>): FileReader => ({
  listFiles: async () => [],
  readFile: async (path) => {
    const f = files[path];
    if (f === undefined) throw new Error(`Missing fake file: ${path}`);
    return f;
  },
});

describe("npm() strategy", () => {
  it("reads the version from package.json at the package path", async () => {
    const strategy = npm();
    const version = await strategy.readVersion({
      name: "api",
      path: "services/api",
      reader: fakeReader({
        "services/api/package.json": JSON.stringify({ name: "api", version: "1.2.3" }),
      }),
    });
    expect(version).toBe("1.2.3");
  });

  it("throws when package.json has no version field", async () => {
    const strategy = npm();
    await expect(
      strategy.readVersion({
        name: "api",
        path: "services/api",
        reader: fakeReader({
          "services/api/package.json": JSON.stringify({ name: "api" }),
        }),
      }),
    ).rejects.toThrow("No 'version' string in services/api/package.json");
  });

  it("throws when version is not a string", async () => {
    const strategy = npm();
    await expect(
      strategy.readVersion({
        name: "api",
        path: "services/api",
        reader: fakeReader({
          "services/api/package.json": JSON.stringify({ version: 123 }),
        }),
      }),
    ).rejects.toThrow("No 'version' string");
  });
});
