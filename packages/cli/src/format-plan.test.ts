import type { PackagePlan } from "@re-kit/core/package-plan";
import { describe, expect, it } from "vitest";
import { formatPlan } from "./format-plan.js";

const entry = (overrides: Partial<PackagePlan> = {}): PackagePlan => ({
  package: "api",
  currentVersion: "1.2.3",
  nextVersion: "1.3.0",
  bumps: ["minor"],
  hotfix: false,
  intents: [
    {
      id: "abc-123",
      package: "api",
      bump: "minor",
      hotfix: false,
      summary: "Add support for X",
    },
  ],
  ...overrides,
});

describe("formatPlan", () => {
  it("returns a friendly message when there are no entries", () => {
    expect(formatPlan([])).toBe("No pending changes.");
  });

  it("renders package, version transition, and intent headlines", () => {
    expect(formatPlan([entry()])).toBe(
      ["api: 1.2.3 → 1.3.0", "  - Add support for X (abc-123)"].join("\n"),
    );
  });

  it("marks hotfix entries", () => {
    expect(formatPlan([entry({ hotfix: true, nextVersion: "1.2.4" })])).toContain("(hotfix)");
  });

  it("uses only the first line of multi-line summaries as the headline", () => {
    const plan = entry({
      intents: [
        {
          id: "x",
          package: "api",
          bump: "minor",
          hotfix: false,
          summary: "First line.\n\nMore detail follows.",
        },
      ],
    });
    expect(formatPlan([plan])).toContain("- First line. (x)");
  });
});
