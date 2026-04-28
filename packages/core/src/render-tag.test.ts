import { describe, expect, it } from "vitest";
import { renderTag } from "./render-tag.js";

const ctx = { name: "api", version: "1.2.3" };

describe("renderTag", () => {
  it("substitutes ${name} and ${version} in a template string", () => {
    expect(renderTag("${name}@${version}", ctx)).toBe("api@1.2.3");
    expect(renderTag("v${version}", ctx)).toBe("v1.2.3");
  });

  it("substitutes the same placeholder more than once", () => {
    expect(renderTag("${name}-${version}-${name}", ctx)).toBe("api-1.2.3-api");
  });

  it("returns the template unchanged when there are no placeholders", () => {
    expect(renderTag("static-tag", ctx)).toBe("static-tag");
  });

  it("throws on an unknown placeholder", () => {
    expect(() => renderTag("${name}@${date}", ctx)).toThrow(
      "Unknown tag template variable: ${date}",
    );
  });

  it("delegates to a custom renderer function", () => {
    const out = renderTag(({ name, version }) => `release/${name}/${version}`, ctx);
    expect(out).toBe("release/api/1.2.3");
  });

  it("returns the custom renderer's output verbatim, including unrelated strings", () => {
    expect(renderTag(() => "anything-goes", ctx)).toBe("anything-goes");
  });
});
