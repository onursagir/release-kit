import { describe, expect, it } from "vitest";
import type { FileReader } from "./file-reader.js";
import { loadIntents } from "./load-intents.js";

const fakeReader = (files: Record<string, string>): FileReader => ({
  listFiles: async (dir) =>
    Object.keys(files).filter((p) => p.startsWith(`${dir}/`) || p.startsWith(`${dir}\\`)),
  readFile: async (path) => {
    const content = files[path];
    if (content === undefined) throw new Error(`Missing fake file: ${path}`);
    return content;
  },
});

const intentBody = (pkg: string, bump: string) =>
  `---\npackage: ${pkg}\nbump: ${bump}\n---\nDoes a thing.\n`;

describe("loadIntents", () => {
  it("returns an empty array for an empty directory", async () => {
    expect(await loadIntents(".changes", fakeReader({}))).toEqual([]);
  });

  it("loads and parses every .md file in the directory", async () => {
    const intents = await loadIntents(
      ".changes",
      fakeReader({
        ".changes/abc-123.md": intentBody("api", "minor"),
        ".changes/def-456.md": intentBody("worker", "patch"),
      }),
    );
    expect(intents).toHaveLength(2);
    expect(intents.map((i) => i.id).sort()).toEqual(["abc-123", "def-456"]);
    expect(intents.find((i) => i.id === "abc-123")).toMatchObject({
      package: "api",
      bump: "minor",
    });
  });

  it("ignores non-markdown files", async () => {
    const intents = await loadIntents(
      ".changes",
      fakeReader({
        ".changes/README.txt": "ignore me",
        ".changes/config.json": "{}",
        ".changes/abc-123.md": intentBody("api", "patch"),
      }),
    );
    expect(intents.map((i) => i.id)).toEqual(["abc-123"]);
  });

  it("derives the intent id from the filename without the .md extension", async () => {
    const intents = await loadIntents(
      "/abs/.changes",
      fakeReader({ "/abs/.changes/quirky-name.md": intentBody("api", "patch") }),
    );
    expect(intents[0]?.id).toBe("quirky-name");
  });

  it("propagates parse errors with the offending file's id", async () => {
    await expect(
      loadIntents(".changes", fakeReader({ ".changes/broken.md": "no frontmatter here" })),
    ).rejects.toThrow("Intent broken: missing YAML frontmatter");
  });
});
