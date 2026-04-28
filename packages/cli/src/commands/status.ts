import type { Config } from "@release-kit/core/config";
import type { FileReader } from "@release-kit/core/file-reader";
import { loadIntents } from "@release-kit/core/load-intents";
import { formatStatus } from "../format-status.js";

export type StatusDeps = {
  readonly reader: FileReader;
};

export const runStatus = async (config: Config, deps: StatusDeps): Promise<string> => {
  const intents = await loadIntents(config.intentsDir, deps.reader);
  return formatStatus(intents);
};
