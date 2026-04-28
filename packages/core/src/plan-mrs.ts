import type { Config } from "./config.js";
import type { Mr } from "./mr.js";
import type { PackagePlan } from "./package-plan.js";

const DEFAULT_BRANCH_PREFIX = "release/";

export const planMrs = (plan: readonly PackagePlan[], config: Config): readonly Mr[] => {
  const mode = config.releases?.mode ?? "isolated";
  if (mode !== "isolated") {
    throw new Error(`Unsupported release mode: ${mode}. Only "isolated" is supported.`);
  }
  const prefix = config.releases?.branchPrefix ?? DEFAULT_BRANCH_PREFIX;

  return plan.map((entry) => ({
    scope: {
      kind: entry.hotfix ? "hotfix" : "release",
      package: entry.package,
    },
    branch: entry.hotfix ? `${prefix}hotfix/${entry.package}` : `${prefix}${entry.package}`,
    packages: [entry],
  }));
};
