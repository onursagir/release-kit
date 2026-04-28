import type { Config } from "@re-kit/core/config";
import type { FileReader } from "@re-kit/core/file-reader";
import type { Strategy } from "@re-kit/core/strategy";
import { describe, expect, it } from "vitest";
import { runPlan } from "./plan.js";

const fakeStrategy = (versionByPath: Record<string, string>): Strategy => ({
  name: "fake",
  readVersion: async ({ path }) => {
    const v = versionByPath[path];
    if (!v) throw new Error(`No version for ${path}`);
    return v;
  },
  writeVersion: async () => {},
});

const baseConfig = (versions: Record<string, string>): Config => ({
  intentsDir: ".changes",
  packages: [
    { name: "api", path: "services/api", strategy: fakeStrategy(versions) },
    { name: "worker", path: "services/worker", strategy: fakeStrategy(versions) },
  ],
});

const intentBody = (pkg: string, bump: string, hotfix = false): string =>
  `---\npackage: ${pkg}\nbump: ${bump}${hotfix ? "\nhotfix: true" : ""}\n---\nDoes a thing.\n`;

const fakeReader = (files: Record<string, string>): FileReader => ({
  listFiles: async (dir) => Object.keys(files).filter((p) => p.startsWith(`${dir}/`)),
  readFile: async (path) => {
    const f = files[path];
    if (f === undefined) throw new Error(`Missing fake file: ${path}`);
    return f;
  },
});

describe("runPlan", () => {
  it("returns 'No pending changes.' when no intents exist", async () => {
    const out = await runPlan(baseConfig({ "services/api": "1.0.0", "services/worker": "2.0.0" }), {
      reader: fakeReader({}),
    });
    expect(out).toBe("No pending changes.");
  });

  it("renders a human-readable summary for pending intents", async () => {
    const out = await runPlan(baseConfig({ "services/api": "1.2.3", "services/worker": "2.0.0" }), {
      reader: fakeReader({ ".changes/abc.md": intentBody("api", "minor") }),
    });
    expect(out).toContain("api: 1.2.3 → 1.3.0");
  });

  it("emits JSON when options.json is true", async () => {
    const out = await runPlan(
      baseConfig({ "services/api": "1.2.3", "services/worker": "2.0.0" }),
      { reader: fakeReader({ ".changes/abc.md": intentBody("api", "patch") }) },
      { json: true },
    );
    const parsed = JSON.parse(out) as Array<{ package: string; nextVersion: string }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ package: "api", nextVersion: "1.2.4" });
  });

  it("partitions hotfix intents into their own entry", async () => {
    const out = await runPlan(
      baseConfig({ "services/api": "1.2.3", "services/worker": "2.0.0" }),
      {
        reader: fakeReader({
          ".changes/a.md": intentBody("api", "minor"),
          ".changes/b.md": intentBody("api", "patch", true),
        }),
      },
      { json: true },
    );
    const parsed = JSON.parse(out) as Array<{ package: string; hotfix: boolean }>;
    expect(parsed).toHaveLength(2);
    expect(parsed.find((p) => p.hotfix)?.package).toBe("api");
  });
});
