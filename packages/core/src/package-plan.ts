import type { Intent } from "./intent.js";
import type { Bump } from "./parse-bump.js";

export type PackagePlan = {
  readonly package: string;
  readonly currentVersion: string;
  readonly nextVersion: string;
  readonly bumps: readonly Bump[];
  readonly intents: readonly Intent[];
  readonly hotfix: boolean;
};
