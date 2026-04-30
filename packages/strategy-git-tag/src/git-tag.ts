import type { Strategy } from "@re-kit/core/strategy";
import { rcompare, valid } from "semver";

export type GitTagOptions = {
  readonly tagPrefix?: string;
};

export const gitTag = (opts: GitTagOptions = {}): Strategy => ({
  name: "git-tag",
  readVersion: async (ctx) => {
    const prefix = opts.tagPrefix ?? `${ctx.name}-v`;
    const tags = await ctx.git.listTags(`${prefix}*`);
    const versions = tags
      .map((tag) => tag.slice(prefix.length))
      .filter((candidate) => valid(candidate) !== null)
      .sort(rcompare);
    return versions[0] ?? "0.0.0";
  },
  writeVersion: async () => {
    // No-op: the tag is created post-merge by the release workflow,
    // not during release-PR preparation.
  },
});
