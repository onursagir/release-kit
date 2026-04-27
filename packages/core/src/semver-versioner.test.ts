import { describe, expect, it } from "vitest";
import { semverVersioner } from "./semver-versioner.js";

describe("semverVersioner.next", () => {
  it("applies a single bump", () => {
    expect(semverVersioner.next("1.2.3", ["patch"])).toBe("1.2.4");
    expect(semverVersioner.next("1.2.3", ["minor"])).toBe("1.3.0");
    expect(semverVersioner.next("1.2.3", ["major"])).toBe("2.0.0");
  });

  it("picks the highest bump when several are pending", () => {
    expect(semverVersioner.next("1.2.3", ["patch", "minor"])).toBe("1.3.0");
    expect(semverVersioner.next("1.2.3", ["patch", "major", "minor"])).toBe("2.0.0");
    expect(semverVersioner.next("1.2.3", ["patch", "patch", "patch"])).toBe("1.2.4");
  });

  it("throws on an invalid current version", () => {
    expect(() => semverVersioner.next("not-a-version", ["patch"])).toThrow(
      "Invalid semver version: not-a-version",
    );
  });

  it("throws when no bumps are supplied", () => {
    expect(() => semverVersioner.next("1.2.3", [])).toThrow(
      "Cannot compute next version from no bumps",
    );
  });
});

describe("semverVersioner.compare", () => {
  it("orders by semver rules", () => {
    const compare = semverVersioner.compare;
    if (!compare) throw new Error("compare should be defined");
    expect(compare("1.2.3", "1.2.4")).toBeLessThan(0);
    expect(compare("2.0.0", "1.99.99")).toBeGreaterThan(0);
    expect(compare("1.2.3", "1.2.3")).toBe(0);
  });
});
