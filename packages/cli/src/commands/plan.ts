import { computePlan } from "@re-kit/core/compute-plan";
import type { Config } from "@re-kit/core/config";
import type { FileReader } from "@re-kit/core/file-reader";
import { loadIntents } from "@re-kit/core/load-intents";
import { semverVersioner } from "@re-kit/core/semver-versioner";
import { formatPlan } from "../format-plan.js";

export type PlanDeps = {
  readonly reader: FileReader;
};

export type PlanOptions = {
  readonly json?: boolean;
};

export const runPlan = async (
  config: Config,
  deps: PlanDeps,
  options: PlanOptions = {},
): Promise<string> => {
  const intents = await loadIntents(config.intentsDir, deps.reader);

  const versions: Record<string, string> = {};
  for (const pkg of config.packages) {
    versions[pkg.name] = await pkg.strategy.readVersion({
      name: pkg.name,
      path: pkg.path,
      reader: deps.reader,
    });
  }

  const entries = computePlan(intents, versions, semverVersioner);
  return options.json ? JSON.stringify(entries, null, 2) : formatPlan(entries);
};
