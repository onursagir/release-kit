import type { FileReader } from "@release-kit/core/file-reader";
import type { FileWriter } from "@release-kit/core/file-writer";
import { describe, expect, it } from "vitest";
import { npm } from "./npm.js";

const fakeReader = (files: Record<string, string>): FileReader => ({
  listFiles: async () => [],
  readFile: async (path) => {
    const f = files[path];
    if (f === undefined) throw new Error(`Missing fake file: ${path}`);
    return f;
  },
});

const captureWriter = (): { writer: FileWriter; written: Record<string, string> } => {
  const written: Record<string, string> = {};
  return {
    written,
    writer: {
      writeFile: async (path, content) => {
        written[path] = content;
      },
      deleteFile: async () => {},
    },
  };
};

describe("npm() strategy", () => {
  describe("readVersion", () => {
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

  describe("writeVersion", () => {
    it("writes the new version into package.json with stable formatting", async () => {
      const strategy = npm();
      const reader = fakeReader({
        "services/api/package.json": JSON.stringify(
          { name: "api", version: "1.2.3", dependencies: { lodash: "^4.0.0" } },
          null,
          2,
        ),
      });
      const { writer, written } = captureWriter();
      await strategy.writeVersion({ name: "api", path: "services/api", reader, writer }, "1.3.0");
      const parsed = JSON.parse(written["services/api/package.json"] ?? "{}");
      expect(parsed.version).toBe("1.3.0");
      expect(parsed.name).toBe("api");
      expect(parsed.dependencies).toEqual({ lodash: "^4.0.0" });
      expect(written["services/api/package.json"]?.endsWith("\n")).toBe(true);
    });
  });
});
