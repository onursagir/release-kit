import { describe, expect, it } from "vitest";
import { computePlan } from "./compute-plan.js";
import type { Intent } from "./intent.js";
import { semverVersioner } from "./semver-versioner.js";

const intent = (overrides: Partial<Intent> & Pick<Intent, "package" | "bump">): Intent => ({
  id: "i",
  hotfix: false,
  summary: "s",
  ...overrides,
});

describe("computePlan", () => {
  it("returns an empty plan when there are no intents", () => {
    expect(computePlan([], { api: "1.0.0" }, semverVersioner)).toEqual([]);
  });

  it("plans a single package from a single intent", () => {
    const plan = computePlan(
      [intent({ id: "a", package: "api", bump: "minor" })],
      { api: "1.2.3" },
      semverVersioner,
    );
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      package: "api",
      currentVersion: "1.2.3",
      nextVersion: "1.3.0",
      bumps: ["minor"],
      hotfix: false,
    });
    expect(plan[0]?.intents).toHaveLength(1);
  });

  it("combines multiple intents for the same package and picks the highest bump", () => {
    const plan = computePlan(
      [
        intent({ id: "a", package: "api", bump: "patch" }),
        intent({ id: "b", package: "api", bump: "minor" }),
        intent({ id: "c", package: "api", bump: "patch" }),
      ],
      { api: "1.2.3" },
      semverVersioner,
    );
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      package: "api",
      nextVersion: "1.3.0",
      bumps: ["patch", "minor", "patch"],
    });
  });

  it("produces one entry per package, sorted by name", () => {
    const plan = computePlan(
      [
        intent({ id: "a", package: "web", bump: "patch" }),
        intent({ id: "b", package: "api", bump: "minor" }),
      ],
      { api: "1.0.0", web: "2.0.0" },
      semverVersioner,
    );
    expect(plan.map((p) => p.package)).toEqual(["api", "web"]);
  });

  it("splits hotfix and non-hotfix intents on the same package into separate entries", () => {
    const plan = computePlan(
      [
        intent({ id: "a", package: "api", bump: "minor" }),
        intent({ id: "b", package: "api", bump: "patch", hotfix: true }),
      ],
      { api: "1.2.3" },
      semverVersioner,
    );
    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({ package: "api", hotfix: true, nextVersion: "1.2.4" });
    expect(plan[1]).toMatchObject({ package: "api", hotfix: false, nextVersion: "1.3.0" });
  });

  it("orders hotfix entries before non-hotfix entries", () => {
    const plan = computePlan(
      [
        intent({ id: "a", package: "web", bump: "minor" }),
        intent({ id: "b", package: "api", bump: "patch", hotfix: true }),
      ],
      { api: "1.0.0", web: "2.0.0" },
      semverVersioner,
    );
    expect(plan.map((p) => ({ pkg: p.package, hotfix: p.hotfix }))).toEqual([
      { pkg: "api", hotfix: true },
      { pkg: "web", hotfix: false },
    ]);
  });

  it("throws when a package has no current version", () => {
    expect(() =>
      computePlan(
        [intent({ id: "a", package: "ghost", bump: "patch" })],
        { api: "1.0.0" },
        semverVersioner,
      ),
    ).toThrow("No current version for package: ghost");
  });
});
