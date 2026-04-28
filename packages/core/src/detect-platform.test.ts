import { describe, expect, it } from "vitest";
import { detectPlatform } from "./detect-platform.js";

describe("detectPlatform", () => {
  it("detects GitHub from an HTTPS remote", () => {
    expect(detectPlatform("https://github.com/foo/bar.git")).toBe("github");
    expect(detectPlatform("https://github.com/foo/bar")).toBe("github");
  });

  it("detects GitHub from an SCP-style SSH remote", () => {
    expect(detectPlatform("git@github.com:foo/bar.git")).toBe("github");
  });

  it("detects GitHub from an ssh:// URL", () => {
    expect(detectPlatform("ssh://git@github.com/foo/bar.git")).toBe("github");
  });

  it("detects GitLab from an HTTPS remote on gitlab.com", () => {
    expect(detectPlatform("https://gitlab.com/foo/bar.git")).toBe("gitlab");
  });

  it("detects GitLab from a self-hosted host containing 'gitlab'", () => {
    expect(detectPlatform("https://gitlab.example.com/foo/bar.git")).toBe("gitlab");
    expect(detectPlatform("git@gitlab.internal:foo/bar.git")).toBe("gitlab");
  });

  it("throws on a known-but-unsupported host", () => {
    expect(() => detectPlatform("https://bitbucket.org/foo/bar.git")).toThrow(
      "Cannot detect platform from remote URL: https://bitbucket.org/foo/bar.git",
    );
  });

  it("throws on an unparseable remote string", () => {
    expect(() => detectPlatform("not a url")).toThrow("Cannot parse git remote URL: not a url");
  });

  it("does not match GitHub Enterprise hosts (require explicit config)", () => {
    expect(() => detectPlatform("https://github.acme.com/foo/bar.git")).toThrow(
      "Cannot detect platform",
    );
  });
});
