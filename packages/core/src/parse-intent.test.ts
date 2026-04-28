import { describe, expect, it } from "vitest";
import { parseIntent } from "./parse-intent.js";

const intent = (frontmatter: string, body = "Add support for X") =>
  `---\n${frontmatter}\n---\n${body}\n`;

describe("parseIntent", () => {
  it("parses a minimal valid intent", () => {
    const result = parseIntent(intent("package: api\nbump: minor"), "abc-123");
    expect(result).toEqual({
      id: "abc-123",
      package: "api",
      bump: "minor",
      hotfix: false,
      summary: "Add support for X",
    });
  });

  it("reads the hotfix flag", () => {
    const result = parseIntent(intent("package: api\nbump: patch\nhotfix: true"), "id");
    expect(result.hotfix).toBe(true);
  });

  it("preserves multi-line summaries", () => {
    const body = "First line.\n\nSecond paragraph.";
    const result = parseIntent(intent("package: api\nbump: patch", body), "id");
    expect(result.summary).toBe(body);
  });

  it("normalizes CRLF line endings", () => {
    const raw = "---\r\npackage: api\r\nbump: patch\r\n---\r\nSummary\r\n";
    const result = parseIntent(raw, "id");
    expect(result.bump).toBe("patch");
    expect(result.summary).toBe("Summary");
  });

  it("throws when frontmatter is missing", () => {
    expect(() => parseIntent("just a body, no yaml block", "id")).toThrow(
      "Intent id: missing YAML frontmatter",
    );
  });

  it("throws when 'package' is missing", () => {
    expect(() => parseIntent(intent("bump: patch"), "id")).toThrow(
      "Intent id: missing or invalid 'package'",
    );
  });

  it("throws when 'bump' is missing", () => {
    expect(() => parseIntent(intent("package: api"), "id")).toThrow(
      "Intent id: missing or invalid 'bump'",
    );
  });

  it("throws when 'bump' is not a recognized value", () => {
    expect(() => parseIntent(intent("package: api\nbump: huge"), "id")).toThrow(
      "Invalid bump: huge",
    );
  });

  it("throws when 'hotfix' is not a boolean", () => {
    expect(() => parseIntent(intent("package: api\nbump: patch\nhotfix: maybe"), "id")).toThrow(
      "Intent id: 'hotfix' must be a boolean",
    );
  });

  it("throws when the summary body is empty", () => {
    expect(() => parseIntent(intent("package: api\nbump: patch", ""), "id")).toThrow(
      "Intent id: summary body is empty",
    );
  });
});
