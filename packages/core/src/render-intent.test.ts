import { describe, expect, it } from "vitest";
import { parseIntent } from "./parse-intent.js";
import { renderIntent } from "./render-intent.js";

describe("renderIntent", () => {
  it("renders a minimal intent", () => {
    const out = renderIntent({ package: "api", bump: "minor", summary: "Add support for X" });
    expect(out).toBe("---\npackage: api\nbump: minor\n---\n\nAdd support for X\n");
  });

  it("includes the hotfix flag when set", () => {
    const out = renderIntent({
      package: "api",
      bump: "patch",
      summary: "Fix crash",
      hotfix: true,
    });
    expect(out).toContain("hotfix: true");
  });

  it("omits the hotfix flag when false or absent", () => {
    const without = renderIntent({ package: "api", bump: "patch", summary: "x" });
    const explicit = renderIntent({ package: "api", bump: "patch", summary: "x", hotfix: false });
    expect(without).not.toContain("hotfix");
    expect(explicit).not.toContain("hotfix");
  });

  it("trims whitespace around the summary body", () => {
    const out = renderIntent({ package: "api", bump: "patch", summary: "  trimmed me  \n\n" });
    expect(out).toContain("\n\ntrimmed me\n");
  });

  it("round-trips through parseIntent", () => {
    const raw = renderIntent({
      package: "api",
      bump: "minor",
      summary: "Multi\n\nparagraph summary",
      hotfix: true,
    });
    const parsed = parseIntent(raw, "id-1");
    expect(parsed).toEqual({
      id: "id-1",
      package: "api",
      bump: "minor",
      hotfix: true,
      summary: "Multi\n\nparagraph summary",
    });
  });
});
