import { describe, expect, it } from "vitest";
import { parseGitHubRemote } from "./parse-remote.js";

describe("parseGitHubRemote", () => {
  it("parses an HTTPS remote with .git suffix", () => {
    expect(parseGitHubRemote("https://github.com/acme/release-kit.git")).toEqual({
      owner: "acme",
      repo: "release-kit",
    });
  });

  it("parses an HTTPS remote without .git suffix", () => {
    expect(parseGitHubRemote("https://github.com/acme/release-kit")).toEqual({
      owner: "acme",
      repo: "release-kit",
    });
  });

  it("parses an SCP-style SSH remote", () => {
    expect(parseGitHubRemote("git@github.com:acme/release-kit.git")).toEqual({
      owner: "acme",
      repo: "release-kit",
    });
  });

  it("parses an ssh:// URL", () => {
    expect(parseGitHubRemote("ssh://git@github.com/acme/release-kit.git")).toEqual({
      owner: "acme",
      repo: "release-kit",
    });
  });

  it("parses a GHE host the same way", () => {
    expect(parseGitHubRemote("https://github.acme.com/acme/release-kit.git")).toEqual({
      owner: "acme",
      repo: "release-kit",
    });
  });

  it("throws on an unparseable remote", () => {
    expect(() => parseGitHubRemote("not a url")).toThrow(/Cannot parse remote URL/);
  });
});
