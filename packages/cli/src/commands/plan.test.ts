import type { Config } from "@release-kit/core/config";
import type { FileReader } from "@release-kit/core/file-reader";
import { describe, expect, it } from "vitest";
import { runPlan } from "./plan.js";

const config: Config = {
  intentsDir: ".changes",
  packages: [
    { name: "api", path: "services/api" },
    { name: "worker", path: "services/worker" },
  ],
};

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

const versionsByPath =
  (versions: Record<string, string>) =>
  async (path: string): Promise<string> => {
    const v = versions[path];
    if (!v) throw new Error(`No version for ${path}`);
    return v;
  };

describe("runPlan", () => {
  it("returns 'No pending changes.' when no intents exist", async () => {
    const out = await runPlan(config, {
      reader: fakeReader({}),
      readVersion: versionsByPath({
        "services/api": "1.0.0",
        "services/worker": "2.0.0",
      }),
    });
    expect(out).toBe("No pending changes.");
  });

  it("renders a human-readable summary for pending intents", async () => {
    const out = await runPlan(config, {
      reader: fakeReader({ ".changes/abc.md": intentBody("api", "minor") }),
      readVersion: versionsByPath({
        "services/api": "1.2.3",
        "services/worker": "2.0.0",
      }),
    });
    expect(out).toContain("api: 1.2.3 → 1.3.0");
  });

  it("emits JSON when options.json is true", async () => {
    const out = await runPlan(
      config,
      {
        reader: fakeReader({ ".changes/abc.md": intentBody("api", "patch") }),
        readVersion: versionsByPath({
          "services/api": "1.2.3",
          "services/worker": "2.0.0",
        }),
      },
      { json: true },
    );
    const parsed = JSON.parse(out) as Array<{ package: string; nextVersion: string }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ package: "api", nextVersion: "1.2.4" });
  });

  it("partitions hotfix intents into their own entry", async () => {
    const out = await runPlan(
      config,
      {
        reader: fakeReader({
          ".changes/a.md": intentBody("api", "minor"),
          ".changes/b.md": intentBody("api", "patch", true),
        }),
        readVersion: versionsByPath({
          "services/api": "1.2.3",
          "services/worker": "2.0.0",
        }),
      },
      { json: true },
    );
    const parsed = JSON.parse(out) as Array<{ package: string; hotfix: boolean }>;
    expect(parsed).toHaveLength(2);
    expect(parsed.find((p) => p.hotfix)?.package).toBe("api");
  });
});
