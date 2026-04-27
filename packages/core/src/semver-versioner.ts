import { compare, inc, valid } from "semver";
import type { Bump } from "./parse-bump.js";
import type { Versioner } from "./versioner.js";

const RANK: Record<Bump, number> = { patch: 0, minor: 1, major: 2 };

const highest = (bumps: readonly Bump[]): Bump => {
  if (bumps.length === 0) throw new Error("Cannot compute next version from no bumps");
  return bumps.reduce((acc, b) => (RANK[b] > RANK[acc] ? b : acc));
};

export const semverVersioner: Versioner = {
  name: "semver",
  next: (current, bumps) => {
    if (!valid(current)) throw new Error(`Invalid semver version: ${current}`);
    const result = inc(current, highest(bumps));
    if (result === null) throw new Error(`semver.inc returned null for ${current}`);
    return result;
  },
  compare,
};
