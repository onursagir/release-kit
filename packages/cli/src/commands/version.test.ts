import type { Config } from "@re-kit/core/config";
import type { FileReader } from "@re-kit/core/file-reader";
import type { FileWriter } from "@re-kit/core/file-writer";
import type { GitAuthor, GitOps } from "@re-kit/core/git-ops";
import type {
  FindMrInput,
  MrBody,
  MrRef,
  OpenMrInput,
  PlatformAdapter,
} from "@re-kit/core/platform-adapter";
import type { Strategy } from "@re-kit/core/strategy";
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

type GitCalls = {
  readonly branches: { readonly name: string; readonly fromRef: string }[];
  readonly addAll: number;
  readonly commits: { readonly message: string; readonly author?: GitAuthor }[];
  readonly pushes: { readonly branch: string; readonly force?: boolean }[];
};

const makeGit = (
  startingRef = "abc123",
): { ops: GitOps; calls: GitCalls } => {
  const calls: GitCalls = { branches: [], addAll: 0, commits: [], pushes: [] };
  let staged = false;
  const ops: GitOps = {
    headRef: async () => startingRef,
    currentBranch: async () => "main",
    createOrResetBranch: async (name, fromRef) => {
      calls.branches.push({ name, fromRef });
      staged = false;
    },
    addAll: async () => {
      (calls as { addAll: number }).addAll += 1;
      staged = true;
    },
    hasStagedChanges: async () => staged,
    commit: async (message, author) => {
      calls.commits.push({ message, author });
      staged = false;
    },
    push: async (branch, opts) => {
      calls.pushes.push({ branch, force: opts?.force });
    },
  };
  return { ops, calls };
};

type AdapterCalls = {
  readonly finds: FindMrInput[];
  readonly opens: OpenMrInput[];
  readonly updates: { readonly ref: MrRef; readonly body: MrBody }[];
};

const makeAdapter = (
  existing: Record<string, MrRef> = {},
): { adapter: PlatformAdapter; calls: AdapterCalls } => {
  const calls: AdapterCalls = { finds: [], opens: [], updates: [] };
  let nextId = 100;
  const adapter: PlatformAdapter = {
    name: "stub",
    findOpenReleaseMr: async (input) => {
      calls.finds.push(input);
      return existing[input.branch] ?? null;
    },
    openReleaseMr: async (input) => {
      calls.opens.push(input);
      const id = nextId++;
      return { id, url: `https://example.test/pr/${id}` };
    },
    updateReleaseMr: async (ref, body) => {
      calls.updates.push({ ref, body });
    },
  };
  return { adapter, calls };
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

  it("returns empty result and skips git/adapter when no intents", async () => {
    const empty = makeFs({
      "packages/api/package.json": JSON.stringify({ name: "api", version: "1.2.3" }, null, 2),
      "packages/web/package.json": JSON.stringify({ name: "web", version: "0.1.0" }, null, 2),
    });
    const git = makeGit();
    const adapter = makeAdapter();
    const result = await runVersion(config, {
      reader: empty.reader,
      writer: empty.writer,
      git: git.ops,
      adapter: adapter.adapter,
      now: FROZEN_NOW,
    });
    expect(result.entries).toHaveLength(0);
    expect(result.mrs).toHaveLength(0);
    expect(git.calls.branches).toHaveLength(0);
    expect(adapter.calls.opens).toHaveLength(0);
    expect(adapter.calls.updates).toHaveLength(0);
  });

  it("bumps the package's version in package.json", async () => {
    const git = makeGit();
    const adapter = makeAdapter();
    await runVersion(config, {
      reader: fs.reader,
      writer: fs.writer,
      git: git.ops,
      adapter: adapter.adapter,
      now: FROZEN_NOW,
    });
    const parsed = JSON.parse(fs.files["packages/api/package.json"] ?? "{}");
    expect(parsed.version).toBe("1.3.0");
  });

  it("creates and pushes a release branch and opens a PR", async () => {
    const git = makeGit("sha-base");
    const adapter = makeAdapter();
    const result = await runVersion(config, {
      reader: fs.reader,
      writer: fs.writer,
      git: git.ops,
      adapter: adapter.adapter,
      now: FROZEN_NOW,
    });

    expect(git.calls.branches).toEqual([{ name: "release/api", fromRef: "sha-base" }]);
    expect(git.calls.commits).toHaveLength(1);
    expect(git.calls.commits[0]?.message).toBe("Release: api@1.3.0");
    expect(git.calls.pushes).toEqual([{ branch: "release/api", force: true }]);
    expect(adapter.calls.opens).toHaveLength(1);
    expect(adapter.calls.opens[0]?.title).toBe("Release: api@1.3.0");
    expect(adapter.calls.opens[0]?.branch).toBe("release/api");
    expect(adapter.calls.opens[0]?.scope).toEqual({ kind: "release", package: "api" });
    expect(adapter.calls.opens[0]?.body).toContain("| api | 1.2.3 | 1.3.0 | minor |");
    expect(result.mrs).toHaveLength(1);
    expect(result.mrs[0]?.status).toBe("opened");
  });

  it("updates an existing PR for the same branch instead of opening a new one", async () => {
    const git = makeGit();
    const existingRef: MrRef = { id: 42, url: "https://example.test/pr/42" };
    const adapter = makeAdapter({ "release/api": existingRef });
    const result = await runVersion(config, {
      reader: fs.reader,
      writer: fs.writer,
      git: git.ops,
      adapter: adapter.adapter,
      now: FROZEN_NOW,
    });
    expect(adapter.calls.opens).toHaveLength(0);
    expect(adapter.calls.updates).toHaveLength(1);
    expect(adapter.calls.updates[0]?.ref).toEqual(existingRef);
    expect(adapter.calls.updates[0]?.body.title).toBe("Release: api@1.3.0");
    expect(result.mrs[0]?.status).toBe("updated");
  });

  it("opens a hotfix-scoped MR on a hotfix-namespaced branch", async () => {
    const hot = makeFs({
      "packages/api/package.json": JSON.stringify({ name: "api", version: "1.2.3" }, null, 2),
      "packages/web/package.json": JSON.stringify({ name: "web", version: "0.1.0" }, null, 2),
      ".changes/h.md": intentBody("api", "patch", "Fix crash", true),
    });
    const git = makeGit();
    const adapter = makeAdapter();
    await runVersion(config, {
      reader: hot.reader,
      writer: hot.writer,
      git: git.ops,
      adapter: adapter.adapter,
      now: FROZEN_NOW,
    });
    expect(git.calls.branches[0]?.name).toBe("release/hotfix/api");
    expect(adapter.calls.opens[0]?.scope).toEqual({ kind: "hotfix", package: "api" });
    expect(adapter.calls.opens[0]?.title).toBe("Hotfix: api@1.2.4");
  });

  it("opens one MR per package in isolated mode, each branched from the same starting ref", async () => {
    fs.files[".changes/def.md"] = intentBody("web", "patch", "Web fix");
    const git = makeGit("sha-base");
    const adapter = makeAdapter();
    const result = await runVersion(config, {
      reader: fs.reader,
      writer: fs.writer,
      git: git.ops,
      adapter: adapter.adapter,
      now: FROZEN_NOW,
    });
    expect(git.calls.branches).toEqual([
      { name: "release/api", fromRef: "sha-base" },
      { name: "release/web", fromRef: "sha-base" },
    ]);
    expect(adapter.calls.opens.map((o) => o.branch)).toEqual(["release/api", "release/web"]);
    expect(result.mrs).toHaveLength(2);
  });

  it("forwards the configured author to the commit", async () => {
    const git = makeGit();
    const adapter = makeAdapter();
    const author: GitAuthor = { name: "Release Bot", email: "bot@release-kit" };
    await runVersion(config, {
      reader: fs.reader,
      writer: fs.writer,
      git: git.ops,
      adapter: adapter.adapter,
      author,
      now: FROZEN_NOW,
    });
    expect(git.calls.commits[0]?.author).toEqual(author);
  });

  it("deletes the consumed intent files (so they ship as part of the release branch diff)", async () => {
    const git = makeGit();
    const adapter = makeAdapter();
    await runVersion(config, {
      reader: fs.reader,
      writer: fs.writer,
      git: git.ops,
      adapter: adapter.adapter,
      now: FROZEN_NOW,
    });
    expect(fs.deleted.has(".changes/abc.md")).toBe(true);
  });

  it("prepends to an existing CHANGELOG.md, preserving prior entries", async () => {
    fs.files["packages/api/CHANGELOG.md"] =
      "# Changelog\n\n## 1.2.3 - 2026-04-01\n\n### Patch Changes\n\n- Older fix\n";
    const git = makeGit();
    const adapter = makeAdapter();
    await runVersion(config, {
      reader: fs.reader,
      writer: fs.writer,
      git: git.ops,
      adapter: adapter.adapter,
      now: FROZEN_NOW,
    });
    const updated = fs.files["packages/api/CHANGELOG.md"] ?? "";
    expect(updated.indexOf("## 1.3.0")).toBeLessThan(updated.indexOf("## 1.2.3"));
    expect(updated).toContain("- Older fix");
  });
});
