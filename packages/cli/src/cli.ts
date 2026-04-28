import { parseArgs } from "node:util";
import { runPlan } from "./commands/plan.js";
import { nodeFileReader } from "./file-reader-node.js";
import { loadConfig } from "./load-config.js";
import { readNpmVersion } from "./read-npm-version.js";

const HELP = `release-kit <command> [options]

Commands:
  plan        Show pending intents and the computed version plan

Options:
  --config <path>   Path to release-kit.config.ts (default: ./release-kit.config.ts)
  --json            Machine-readable output (plan)
  --help            Show this help
`;

export const main = async (argv: readonly string[]): Promise<number> => {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      config: { type: "string" },
      json: { type: "boolean" },
      help: { type: "boolean" },
    },
  });

  if (values.help || positionals.length === 0) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  const command = positionals[0];
  const configPath = values.config ?? "release-kit.config.ts";

  if (command === "plan") {
    const config = await loadConfig(configPath);
    const out = await runPlan(
      config,
      { reader: nodeFileReader, readVersion: readNpmVersion },
      { json: Boolean(values.json) },
    );
    process.stdout.write(`${out}\n`);
    return 0;
  }

  process.stderr.write(`Unknown command: ${command}\n${HELP}\n`);
  return 1;
};
