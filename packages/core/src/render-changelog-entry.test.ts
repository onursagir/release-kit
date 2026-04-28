import { describe, expect, it } from "vitest";
import type { Intent } from "./intent.js";
import type { PackagePlan } from "./package-plan.js";
import { renderChangelogEntry } from "./render-changelog-entry.js";

const intent = (id: string, bump: Intent["bump"], summary: string): Intent => ({
  id,
  package: "api",
  bump,
  hotfix: false,
  summary,
});

const plan = (overrides: Partial<PackagePlan> & Pick<PackagePlan, "intents">): PackagePlan => ({
  package: "api",
  currentVersion: "1.2.3",
  nextVersion: "1.3.0",
  bumps: overrides.intents.map((i) => i.bump),
  hotfix: false,
  ...overrides,
});

describe("renderChangelogEntry", () => {
  it("renders a single bump group", () => {
    const out = renderChangelogEntry(
      plan({ intents: [intent("a", "minor", "Add support for X")] }),
    );
    expect(out).toBe(
      ["## 1.3.0", "", "### Minor Changes", "", "- Add support for X", ""].join("\n"),
    );
  });

  it("orders groups major -> minor -> patch and skips empty groups", () => {
    const out = renderChangelogEntry(
      plan({
        nextVersion: "2.0.0",
        intents: [
          intent("a", "patch", "Fix Y"),
          intent("b", "major", "Break Z"),
          intent("c", "patch", "Fix W"),
        ],
      }),
    );
    expect(out).toBe(
      [
        "## 2.0.0",
        "",
        "### Major Changes",
        "",
        "- Break Z",
        "",
        "### Patch Changes",
        "",
        "- Fix Y",
        "- Fix W",
        "",
      ].join("\n"),
    );
  });

  it("includes the date in the header when provided", () => {
    const out = renderChangelogEntry(
      plan({ intents: [intent("a", "patch", "Fix")] }),
      "2026-04-28",
    );
    expect(out.startsWith("## 1.3.0 - 2026-04-28\n")).toBe(true);
  });

  it("appends a (hotfix) tag for hotfix entries", () => {
    const out = renderChangelogEntry(
      plan({ hotfix: true, intents: [intent("a", "patch", "Urgent fix")] }),
    );
    expect(out.startsWith("## 1.3.0 (hotfix)\n")).toBe(true);
  });

  it("combines date and hotfix tag", () => {
    const out = renderChangelogEntry(
      plan({ hotfix: true, intents: [intent("a", "patch", "Urgent")] }),
      "2026-04-28",
    );
    expect(out.startsWith("## 1.3.0 - 2026-04-28 (hotfix)\n")).toBe(true);
  });

  it("indents continuation lines of multi-line summaries", () => {
    const out = renderChangelogEntry(
      plan({ intents: [intent("a", "minor", "First line.\n\nSecond paragraph.")] }),
    );
    expect(out).toContain("- First line.\n  \n  Second paragraph.\n");
  });
});
