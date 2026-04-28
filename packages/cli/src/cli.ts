import { parseArgs } from "node:util";
import { runPlan } from "./commands/plan.js";
import { runStatus } from "./commands/status.js";
import { runVersion } from "./commands/version.js";
import { nodeFileReader } from "./file-reader-node.js";
import { nodeFileWriter } from "./file-writer-node.js";
import { loadConfig } from "./load-config.js";

const HELP = `release-kit <command> [options]

Commands:
  status      List pending intents grouped by package
  plan        Show pending intents and the computed version plan
  version     Apply pending intents: bump versions, write CHANGELOGs, delete intents

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

  if (command === "status") {
    const config = await loadConfig(configPath);
    const out = await runStatus(config, { reader: nodeFileReader });
    process.stdout.write(`${out}\n`);
    return 0;
  }

  if (command === "plan") {
    const config = await loadConfig(configPath);
    const out = await runPlan(config, { reader: nodeFileReader }, { json: Boolean(values.json) });
    process.stdout.write(`${out}\n`);
    return 0;
  }

  if (command === "version") {
    const config = await loadConfig(configPath);
    const result = await runVersion(config, {
      reader: nodeFileReader,
      writer: nodeFileWriter,
    });
    if (result.entries.length === 0) {
      process.stdout.write("No pending intents — nothing to version.\n");
    } else {
      for (const entry of result.entries) {
        const tag = entry.hotfix ? " (hotfix)" : "";
        process.stdout.write(
          `${entry.package}: ${entry.currentVersion} → ${entry.nextVersion}${tag}\n`,
        );
      }
    }
    return 0;
  }

  process.stderr.write(`Unknown command: ${command}\n${HELP}\n`);
  return 1;
};
