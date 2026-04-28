import { describe, expect, it } from "vitest";
import type { Config } from "./config.js";
import type { PackagePlan } from "./package-plan.js";
import { planMrs } from "./plan-mrs.js";
import type { Strategy } from "./strategy.js";

const stubStrategy: Strategy = {
  name: "stub",
  readVersion: async () => "0.0.0",
  writeVersion: async () => {},
};

const baseConfig: Config = {
  intentsDir: ".changes",
  packages: [
    { name: "api", path: "packages/api", strategy: stubStrategy },
    { name: "web", path: "packages/web", strategy: stubStrategy },
  ],
};

const entry = (overrides: Partial<PackagePlan> = {}): PackagePlan => ({
  package: "api",
  currentVersion: "1.0.0",
  nextVersion: "1.1.0",
  bumps: ["minor"],
  intents: [],
  hotfix: false,
  ...overrides,
});

describe("planMrs", () => {
  it("emits one MR per package in isolated mode", () => {
    const mrs = planMrs(
      [entry({ package: "api" }), entry({ package: "web", nextVersion: "0.2.0" })],
      baseConfig,
    );
    expect(mrs).toHaveLength(2);
    expect(mrs[0]?.branch).toBe("release/api");
    expect(mrs[1]?.branch).toBe("release/web");
  });

  it("uses release scope kind for non-hotfix entries", () => {
    const [mr] = planMrs([entry()], baseConfig);
    expect(mr?.scope).toEqual({ kind: "release", package: "api" });
  });

  it("uses hotfix scope kind and a hotfix-namespaced branch for hotfix entries", () => {
    const [mr] = planMrs([entry({ hotfix: true })], baseConfig);
    expect(mr?.scope).toEqual({ kind: "hotfix", package: "api" });
    expect(mr?.branch).toBe("release/hotfix/api");
  });

  it("respects a custom branch prefix from config", () => {
    const cfg: Config = { ...baseConfig, releases: { branchPrefix: "rel-" } };
    const mrs = planMrs([entry(), entry({ package: "api", hotfix: true })], cfg);
    expect(mrs[0]?.branch).toBe("rel-api");
    expect(mrs[1]?.branch).toBe("rel-hotfix/api");
  });

  it("each MR carries exactly the one package plan it represents", () => {
    const a = entry({ package: "api" });
    const w = entry({ package: "web", nextVersion: "0.2.0" });
    const mrs = planMrs([a, w], baseConfig);
    expect(mrs[0]?.packages).toEqual([a]);
    expect(mrs[1]?.packages).toEqual([w]);
  });

  it("returns an empty list when the plan is empty", () => {
    expect(planMrs([], baseConfig)).toEqual([]);
  });

  it("throws on unsupported combined mode", () => {
    const cfg: Config = { ...baseConfig, releases: { mode: "combined" } };
    expect(() => planMrs([entry()], cfg)).toThrow(/combined/);
  });
});
