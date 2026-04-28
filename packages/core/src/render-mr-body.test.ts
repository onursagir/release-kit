import { describe, expect, it } from "vitest";
import type { Intent } from "./intent.js";
import type { Mr } from "./mr.js";
import type { PackagePlan } from "./package-plan.js";
import { releaseKitMarker, renderMrBody } from "./render-mr-body.js";

const intent = (overrides: Partial<Intent> = {}): Intent => ({
  id: "abc",
  package: "api",
  bump: "minor",
  hotfix: false,
  summary: "Add support for X",
  ...overrides,
});

const plan = (overrides: Partial<PackagePlan> = {}): PackagePlan => ({
  package: "api",
  currentVersion: "1.0.0",
  nextVersion: "1.1.0",
  bumps: ["minor"],
  intents: [intent()],
  hotfix: false,
  ...overrides,
});

const mr = (overrides: Partial<Mr> = {}): Mr => ({
  scope: { kind: "release", package: "api" },
  branch: "release/api",
  packages: [plan()],
  ...overrides,
});

describe("renderMrBody", () => {
  it("titles a release MR with the package and target version", () => {
    expect(renderMrBody(mr()).title).toBe("Release: api@1.1.0");
  });

  it("titles a hotfix MR with the Hotfix prefix", () => {
    const out = renderMrBody(
      mr({
        scope: { kind: "hotfix", package: "api" },
        branch: "release/hotfix/api",
        packages: [plan({ hotfix: true, bumps: ["patch"], nextVersion: "1.0.1" })],
      }),
    );
    expect(out.title).toBe("Hotfix: api@1.0.1");
  });

  it("renders a packages table with from/to/bump", () => {
    const out = renderMrBody(mr());
    expect(out.body).toContain("| Package | From | To | Bump |");
    expect(out.body).toContain("| api | 1.0.0 | 1.1.0 | minor |");
  });

  it("picks the highest bump in the table when multiple intents stacked", () => {
    const out = renderMrBody(
      mr({
        packages: [plan({ bumps: ["patch", "minor", "major"], nextVersion: "2.0.0" })],
      }),
    );
    expect(out.body).toContain("| api | 1.0.0 | 2.0.0 | major |");
  });

  it("includes the rendered changelog entry inline", () => {
    const out = renderMrBody(mr());
    expect(out.body).toContain("## 1.1.0");
    expect(out.body).toContain("### Minor Changes");
    expect(out.body).toContain("- Add support for X");
  });

  it("appends a release-kit marker comment for adapter detection", () => {
    const out = renderMrBody(mr());
    expect(out.body).toContain("<!-- release-kit:scope=release:package=api -->");
  });

  it("encodes hotfix scope in the marker", () => {
    const out = renderMrBody(
      mr({
        scope: { kind: "hotfix", package: "api" },
        packages: [plan({ hotfix: true })],
      }),
    );
    expect(out.body).toContain("<!-- release-kit:scope=hotfix:package=api -->");
  });

  it("releaseKitMarker is exported and stable", () => {
    expect(releaseKitMarker({ ...mr() })).toBe("<!-- release-kit:scope=release:package=api -->");
  });

  it("throws when asked to render an MR with no package plans", () => {
    expect(() => renderMrBody(mr({ packages: [] }))).toThrow(/no package plans/);
  });
});
