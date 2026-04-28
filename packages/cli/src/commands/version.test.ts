import type { Config } from "@release-kit/core/config";
import type { FileReader } from "@release-kit/core/file-reader";
import type { FileWriter } from "@release-kit/core/file-writer";
import type { Strategy } from "@release-kit/core/strategy";
import { beforeEach, describe, expect, it } from "vitest";
import { runVersion } from "./version.js";

type FakeFs = {
  readonly files: Record<string, string>;
  readonly deleted: Set<string>;
  readonly reader: FileReader;
  readonly writer: FileWriter;
};

const makeFs = (initial: Record<string, string>): FakeFs => {
  const files = { ...initial };
  const deleted = new Set<string>();
  const reader: FileReader = {
    listFiles: async (dir) => Object.keys(files).filter((p) => p.startsWith(`${dir}/`)),
    readFile: async (path) => {
      const content = files[path];
      if (content === undefined) {
        const err = new Error(`ENOENT: ${path}`) as NodeJS.ErrnoException;
        err.code = "ENOENT";
        throw err;
      }
      return content;
    },
  };
  const writer: FileWriter = {
    writeFile: async (path, content) => {
      files[path] = content;
    },
    deleteFile: async (path) => {
      delete files[path];
      deleted.add(path);
    },
  };
  return { files, deleted, reader, writer };
};

const npmStrategy: Strategy = {
  name: "npm",
  readVersion: async (ctx) => {
    const raw = await ctx.reader.readFile(`${ctx.path}/package.json`);
    return (JSON.parse(raw) as { version: string }).version;
  },
  writeVersion: async (ctx, next) => {
    const raw = await ctx.reader.readFile(`${ctx.path}/package.json`);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    parsed.version = next;
    await ctx.writer.writeFile(`${ctx.path}/package.json`, `${JSON.stringify(parsed, null, 2)}\n`);
  },
};

const config: Config = {
  intentsDir: ".changes",
  packages: [
    { name: "api", path: "packages/api", strategy: npmStrategy },
    { name: "web", path: "packages/web", strategy: npmStrategy },
  ],
};

const intentBody = (pkg: string, bump: string, summary = "Does a thing", hotfix = false): string =>
  `---\npackage: ${pkg}\nbump: ${bump}${hotfix ? "\nhotfix: true" : ""}\n---\n${summary}\n`;

const FROZEN_NOW = (): Date => new Date("2026-04-28T12:00:00Z");

describe("runVersion", () => {
  let fs: FakeFs;

  beforeEach(() => {
    fs = makeFs({
      "packages/api/package.json": JSON.stringify({ name: "api", version: "1.2.3" }, null, 2),
      "packages/web/package.json": JSON.stringify({ name: "web", version: "0.1.0" }, null, 2),
      ".changes/abc.md": intentBody("api", "minor", "Add support for X"),
    });
  });

  it("returns no entries when there are no intents", async () => {
    const empty = makeFs({
      "packages/api/package.json": JSON.stringify({ name: "api", version: "1.2.3" }, null, 2),
      "packages/web/package.json": JSON.stringify({ name: "web", version: "0.1.0" }, null, 2),
    });
    const result = await runVersion(config, {
      reader: empty.reader,
      writer: empty.writer,
      now: FROZEN_NOW,
    });
    expect(result.entries).toHaveLength(0);
  });

  it("bumps the package's version in package.json", async () => {
    await runVersion(config, { reader: fs.reader, writer: fs.writer, now: FROZEN_NOW });
    const parsed = JSON.parse(fs.files["packages/api/package.json"] ?? "{}");
    expect(parsed.version).toBe("1.3.0");
  });

  it("creates CHANGELOG.md with the rendered entry when none exists", async () => {
    await runVersion(config, { reader: fs.reader, writer: fs.writer, now: FROZEN_NOW });
    const changelog = fs.files["packages/api/CHANGELOG.md"];
    expect(changelog).toContain("# Changelog");
    expect(changelog).toContain("## 1.3.0 - 2026-04-28");
    expect(changelog).toContain("- Add support for X");
  });

  it("prepends to an existing CHANGELOG.md, preserving prior entries", async () => {
    fs.files["packages/api/CHANGELOG.md"] =
      "# Changelog\n\n## 1.2.3 - 2026-04-01\n\n### Patch Changes\n\n- Older fix\n";
    await runVersion(config, { reader: fs.reader, writer: fs.writer, now: FROZEN_NOW });
    const updated = fs.files["packages/api/CHANGELOG.md"] ?? "";
    expect(updated.indexOf("## 1.3.0")).toBeLessThan(updated.indexOf("## 1.2.3"));
    expect(updated).toContain("- Older fix");
  });

  it("deletes consumed intent files", async () => {
    await runVersion(config, { reader: fs.reader, writer: fs.writer, now: FROZEN_NOW });
    expect(fs.deleted.has(".changes/abc.md")).toBe(true);
    expect(fs.files[".changes/abc.md"]).toBeUndefined();
  });

  it("leaves other packages untouched", async () => {
    const before = fs.files["packages/web/package.json"];
    await runVersion(config, { reader: fs.reader, writer: fs.writer, now: FROZEN_NOW });
    expect(fs.files["packages/web/package.json"]).toBe(before);
    expect(fs.files["packages/web/CHANGELOG.md"]).toBeUndefined();
  });

  it("processes multiple packages in one run", async () => {
    fs.files[".changes/def.md"] = intentBody("web", "patch", "Web fix");
    await runVersion(config, { reader: fs.reader, writer: fs.writer, now: FROZEN_NOW });
    expect(JSON.parse(fs.files["packages/api/package.json"] ?? "{}").version).toBe("1.3.0");
    expect(JSON.parse(fs.files["packages/web/package.json"] ?? "{}").version).toBe("0.1.1");
    expect(fs.deleted.has(".changes/abc.md")).toBe(true);
    expect(fs.deleted.has(".changes/def.md")).toBe(true);
  });
});
