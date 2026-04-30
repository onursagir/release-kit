import { join } from "node:path";
import { computePlan } from "@re-kit/core/compute-plan";
import type { Config, PackageConfig } from "@re-kit/core/config";
import type { FileReader } from "@re-kit/core/file-reader";
import type { FileWriter } from "@re-kit/core/file-writer";
import type { GitAuthor, GitOps } from "@re-kit/core/git-ops";
import { loadIntents } from "@re-kit/core/load-intents";
import type { Mr } from "@re-kit/core/mr";
import type { PackagePlan } from "@re-kit/core/package-plan";
import { planMrs } from "@re-kit/core/plan-mrs";
import type { MrRef, PlatformAdapter } from "@re-kit/core/platform-adapter";
import { renderChangelogEntry } from "@re-kit/core/render-changelog-entry";
import { renderMrBody } from "@re-kit/core/render-mr-body";
import { semverVersioner } from "@re-kit/core/semver-versioner";

export type VersionDeps = {
  readonly reader: FileReader;
  readonly writer: FileWriter;
  readonly git: GitOps;
  readonly adapter: PlatformAdapter;
  readonly now?: () => Date;
  readonly author?: GitAuthor;
};

export type VersionMrResult = {
  readonly mr: Mr;
  readonly ref: MrRef;
  readonly status: "opened" | "updated";
};

export type VersionResult = {
  readonly entries: readonly PackagePlan[];
  readonly mrs: readonly VersionMrResult[];
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

const applyPackagePlan = async (
  entry: PackagePlan,
  pkg: PackageConfig,
  intentsDir: string,
  today: string,
  deps: VersionDeps,
): Promise<void> => {
  await pkg.strategy.writeVersion(
    {
      name: pkg.name,
      path: pkg.path,
      reader: deps.reader,
      writer: deps.writer,
      git: deps.git,
    },
    entry.nextVersion,
  );
  const changelogPath = join(pkg.path, "CHANGELOG.md");
  const existing = await readChangelog(changelogPath, deps.reader);
  const rendered = renderChangelogEntry(entry, today);
  await deps.writer.writeFile(changelogPath, prependChangelogEntry(existing, rendered));
  for (const intent of entry.intents) {
    await deps.writer.deleteFile(join(intentsDir, `${intent.id}.md`));
  }
};

export const runVersion = async (config: Config, deps: VersionDeps): Promise<VersionResult> => {
  const intents = await loadIntents(config.intentsDir, deps.reader);
  if (intents.length === 0) return { entries: [], mrs: [] };

  const pkgsByName = new Map<string, PackageConfig>(config.packages.map((pkg) => [pkg.name, pkg]));

  const versions: Record<string, string> = {};
  for (const pkg of config.packages) {
    versions[pkg.name] = await pkg.strategy.readVersion({
      name: pkg.name,
      path: pkg.path,
      reader: deps.reader,
      git: deps.git,
    });
  }

  const plan = computePlan(intents, versions, semverVersioner);
  const mrs = planMrs(plan, config);
  const today = (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
  const startingRef = await deps.git.headRef();

  const results: VersionMrResult[] = [];
  for (const mr of mrs) {
    await deps.git.createOrResetBranch(mr.branch, startingRef);

    for (const entry of mr.packages) {
      const pkg = pkgsByName.get(entry.package);
      if (!pkg) throw new Error(`Plan references unknown package: ${entry.package}`);
      await applyPackagePlan(entry, pkg, config.intentsDir, today, deps);
    }

    await deps.git.addAll();
    if (!(await deps.git.hasStagedChanges())) continue;

    const { title, body } = renderMrBody(mr);
    await deps.git.commit(title, deps.author);
    await deps.git.push(mr.branch, { force: true });

    const existing = await deps.adapter.findOpenReleaseMr({
      scope: mr.scope,
      branch: mr.branch,
    });
    if (existing) {
      await deps.adapter.updateReleaseMr(existing, { title, body });
      results.push({ mr, ref: existing, status: "updated" });
    } else {
      const ref = await deps.adapter.openReleaseMr({
        scope: mr.scope,
        branch: mr.branch,
        title,
        body,
      });
      results.push({ mr, ref, status: "opened" });
    }
  }

  return { entries: plan, mrs: results };
};
