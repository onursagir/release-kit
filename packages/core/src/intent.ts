import type { Bump } from "./parse-bump.js";

export type Intent = {
  readonly id: string;
  readonly package: string;
  readonly bump: Bump;
  readonly hotfix: boolean;
  readonly summary: string;
};
