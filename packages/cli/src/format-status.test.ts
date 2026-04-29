import type { Intent } from "@re-kit/core/intent";
import { describe, expect, it } from "vitest";
import { formatStatus } from "./format-status.js";

const intent = (overrides: Partial<Intent> & Pick<Intent, "id" | "package" | "bump">): Intent => ({
  hotfix: false,
  summary: "Does a thing",
  ...overrides,
});

describe("formatStatus", () => {
  it("reports an empty state", () => {
    expect(formatStatus([])).toBe("No pending intents.");
  });

  it("groups intents per package and sorts package names alphabetically", () => {
    const out = formatStatus([
      intent({ id: "a", package: "web", bump: "patch", summary: "Web fix" }),
      intent({ id: "b", package: "api", bump: "minor", summary: "API thing" }),
      intent({ id: "c", package: "api", bump: "patch", summary: "API patch" }),
    ]);
    const apiIdx = out.indexOf("api (2):");
    const webIdx = out.indexOf("web (1):");
    expect(apiIdx).toBeGreaterThan(-1);
    expect(webIdx).toBeGreaterThan(apiIdx);
  });

  it("includes a header counting intents and packages with correct pluralization", () => {
    expect(formatStatus([intent({ id: "a", package: "api", bump: "patch" })]).split("\n")[0]).toBe(
      "1 pending intent across 1 package:",
    );
    expect(
      formatStatus([
        intent({ id: "a", package: "api", bump: "patch" }),
        intent({ id: "b", package: "web", bump: "patch" }),
      ]).split("\n")[0],
    ).toBe("2 pending intents across 2 packages:");
  });

  it("tags hotfix intents", () => {
    const out = formatStatus([
      intent({ id: "x", package: "api", bump: "patch", hotfix: true, summary: "Urgent" }),
    ]);
    expect(out).toContain("patch  Urgent (x) [hotfix]");
  });

  it("uses only the first line of multi-line summaries", () => {
    const out = formatStatus([
      intent({
        id: "x",
        package: "api",
        bump: "minor",
        summary: "Headline.\n\nMore detail.",
      }),
    ]);
    expect(out).toContain("Headline. (x)");
    expect(out).not.toContain("More detail.");
  });
});
