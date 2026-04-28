import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { parseArgs, promisify } from "node:util";
import { githubAdapter } from "@release-kit/platform-github/github-adapter";
import { parseGitHubRemote } from "@release-kit/platform-github/parse-remote";
import { runAdd } from "./commands/add.js";
import { runPlan } from "./commands/plan.js";
import { runStatus } from "./commands/status.js";
import { runVersion } from "./commands/version.js";
import { nodeFileReader } from "./file-reader-node.js";
import { nodeFileWriter } from "./file-writer-node.js";
import { nodeGitOps } from "./git-ops-node.js";
import { loadConfig } from "./load-config.js";

const exec = promisify(execFile);

const readOriginUrl = async (): Promise<string> => {
  const { stdout } = await exec("git", ["config", "--get", "remote.origin.url"]);
  return stdout.trim();
};

const HELP = `release-kit <command> [options]

Commands:
  status      List pending intents grouped by package
  plan        Show pending intents and the computed version plan
  version     Apply pending intents: bump versions, write CHANGELOGs, delete intents
  add         Create a new intent file in the configured intentsDir

Options:
  --config <path>   Path to release-kit.config.ts (default: ./release-kit.config.ts)
  --json            Machine-readable output (plan)
  --help            Show this help

add options:
  --package <name>          Package the intent applies to (required)
  --bump <major|minor|patch> Version bump kind (required)
  --summary <text>          Summary line (required)
  --hotfix                  Mark the intent as a hotfix
`;

const generateId = (): string => randomBytes(5).toString("hex");

export const main = async (argv: readonly string[]): Promise<number> => {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }

  const command = argv[0];
  const rest = argv.slice(1);

  if (command === "add") {
    const { values } = parseArgs({
      args: [...rest],
      options: {
        config: { type: "string" },
        package: { type: "string" },
        bump: { type: "string" },
        summary: { type: "string" },
        hotfix: { type: "boolean" },
      },
    });
    if (!values.package || !values.bump || !values.summary) {
      process.stderr.write("add requires --package, --bump, and --summary\n");
      return 1;
    }
    const config = await loadConfig(values.config ?? "release-kit.config.ts");
    const result = await runAdd(
      config,
      { writer: nodeFileWriter, generateId },
      {
        package: values.package,
        bump: values.bump,
        summary: values.summary,
        hotfix: Boolean(values.hotfix),
      },
    );
    process.stdout.write(`Wrote ${result.path}\n`);
    return 0;
  }

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
    const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    if (!token) {
      process.stderr.write("version requires GITHUB_TOKEN (or GH_TOKEN) in the environment\n");
      return 1;
    }
    const { owner, repo } = parseGitHubRemote(await readOriginUrl());
    const adapter = githubAdapter({ token, owner, repo });
    const author = {
      name: process.env.RELEASE_KIT_AUTHOR_NAME ?? "release-kit",
      email: process.env.RELEASE_KIT_AUTHOR_EMAIL ?? "release-kit@users.noreply.github.com",
    };
    const result = await runVersion(config, {
      reader: nodeFileReader,
      writer: nodeFileWriter,
      git: nodeGitOps(),
      adapter,
      author,
    });
    if (result.entries.length === 0) {
      process.stdout.write("No pending intents — nothing to version.\n");
      return 0;
    }
    for (const entry of result.entries) {
      const tag = entry.hotfix ? " (hotfix)" : "";
      process.stdout.write(
        `${entry.package}: ${entry.currentVersion} → ${entry.nextVersion}${tag}\n`,
      );
    }
    for (const m of result.mrs) {
      process.stdout.write(`  ${m.status} ${m.mr.branch} → ${m.ref.url}\n`);
    }
    return 0;
  }

  process.stderr.write(`Unknown command: ${command}\n${HELP}\n`);
  return 1;
};
