import { join } from "node:path";
import { computePlan } from "@release-kit/core/compute-plan";
import type { Config, PackageConfig } from "@release-kit/core/config";
import type { FileReader } from "@release-kit/core/file-reader";
import type { FileWriter } from "@release-kit/core/file-writer";
import { loadIntents } from "@release-kit/core/load-intents";
import type { PackagePlan } from "@release-kit/core/package-plan";
import { renderChangelogEntry } from "@release-kit/core/render-changelog-entry";
import { semverVersioner } from "@release-kit/core/semver-versioner";

export type VersionDeps = {
  readonly reader: FileReader;
  readonly writer: FileWriter;
  readonly now?: () => Date;
};

export type VersionResult = {
  readonly entries: readonly PackagePlan[];
};

const HEADER = "# Changelog\n\n";

const prependChangelogEntry = (existing: string, entry: string): string => {
  const normalized = existing.replace(/\r\n/g, "\n");
  if (normalized.trim() === "") return `${HEADER}${entry}`;
  if (normalized.startsWith(HEADER)) {
    return `${HEADER}${entry}\n${normalized.slice(HEADER.length)}`;
  }
  return `${entry}\n${normalized}`;
};

const readChangelog = async (path: string, reader: FileReader): Promise<string> => {
  try {
    return await reader.readFile(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw err;
  }
};

export const runVersion = async (config: Config, deps: VersionDeps): Promise<VersionResult> => {
  const intents = await loadIntents(config.intentsDir, deps.reader);
  if (intents.length === 0) return { entries: [] };

  const pkgsByName = new Map<string, PackageConfig>(config.packages.map((pkg) => [pkg.name, pkg]));

  const versions: Record<string, string> = {};
  for (const pkg of config.packages) {
    versions[pkg.name] = await pkg.strategy.readVersion({
      name: pkg.name,
      path: pkg.path,
      reader: deps.reader,
    });
  }

  const plan = computePlan(intents, versions, semverVersioner);
  const today = (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
  const consumed = new Set<string>();

  for (const entry of plan) {
    const pkg = pkgsByName.get(entry.package);
    if (!pkg) throw new Error(`Plan references unknown package: ${entry.package}`);

    await pkg.strategy.writeVersion(
      { name: pkg.name, path: pkg.path, reader: deps.reader, writer: deps.writer },
      entry.nextVersion,
    );

    const changelogPath = join(pkg.path, "CHANGELOG.md");
    const existing = await readChangelog(changelogPath, deps.reader);
    const rendered = renderChangelogEntry(entry, today);
    await deps.writer.writeFile(changelogPath, prependChangelogEntry(existing, rendered));

    for (const intent of entry.intents) consumed.add(intent.id);
  }

  for (const id of consumed) {
    await deps.writer.deleteFile(join(config.intentsDir, `${id}.md`));
  }

  return { entries: plan };
};
