import type { FileReader } from "@re-kit/core/file-reader";
import type { FileWriter } from "@re-kit/core/file-writer";
import { describe, expect, it } from "vitest";
import { rekit } from "./rekit.js";

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

describe("rekit() strategy", () => {
  describe("readVersion", () => {
    it("reads the version from re-kit.json at the package path", async () => {
      const strategy = rekit();
      const version = await strategy.readVersion({
        name: "actions",
        path: "actions",
        reader: fakeReader({
          "actions/re-kit.json": JSON.stringify({ version: "1.2.3" }),
        }),
      });
      expect(version).toBe("1.2.3");
    });

    it("throws when re-kit.json has no version field", async () => {
      const strategy = rekit();
      await expect(
        strategy.readVersion({
          name: "actions",
          path: "actions",
          reader: fakeReader({
            "actions/re-kit.json": JSON.stringify({}),
          }),
        }),
      ).rejects.toThrow("No 'version' string in actions/re-kit.json");
    });

    it("throws when version is not a string", async () => {
      const strategy = rekit();
      await expect(
        strategy.readVersion({
          name: "actions",
          path: "actions",
          reader: fakeReader({
            "actions/re-kit.json": JSON.stringify({ version: 123 }),
          }),
        }),
      ).rejects.toThrow("No 'version' string");
    });
  });

  describe("writeVersion", () => {
    it("writes the new version into re-kit.json preserving other fields", async () => {
      const strategy = rekit();
      const reader = fakeReader({
        "actions/re-kit.json": JSON.stringify({ version: "1.2.3", description: "the actions" }, null, 2),
      });
      const { writer, written } = captureWriter();
      await strategy.writeVersion({ name: "actions", path: "actions", reader, writer }, "1.3.0");
      const parsed = JSON.parse(written["actions/re-kit.json"] ?? "{}");
      expect(parsed.version).toBe("1.3.0");
      expect(parsed.description).toBe("the actions");
      expect(written["actions/re-kit.json"]?.endsWith("\n")).toBe(true);
    });
  });
});
