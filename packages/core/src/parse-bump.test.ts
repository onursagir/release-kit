import { describe, expect, it } from "vitest";
import { parseBump } from "./parse-bump.js";

describe("parseBump", () => {
  it("parses canonical values", () => {
    expect(parseBump("major")).toBe("major");
    expect(parseBump("minor")).toBe("minor");
    expect(parseBump("patch")).toBe("patch");
  });

  it("normalizes case and surrounding whitespace", () => {
    expect(parseBump(" Major ")).toBe("major");
    expect(parseBump("PATCH")).toBe("patch");
  });

  it("throws on invalid input", () => {
    expect(() => parseBump("bigly")).toThrow("Invalid bump: bigly");
    expect(() => parseBump("")).toThrow();
  });
});
