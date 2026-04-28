import type { MrScope } from "./mr-scope.js";
import type { PackagePlan } from "./package-plan.js";

export type Mr = {
  readonly scope: MrScope;
  readonly branch: string;
  readonly packages: readonly PackagePlan[];
};
