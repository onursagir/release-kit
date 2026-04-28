import type { Intent } from "./intent.js";
import type { PackagePlan } from "./package-plan.js";
import type { Versioner } from "./versioner.js";

export const computePlan = (
  intents: readonly Intent[],
  currentVersions: Readonly<Record<string, string>>,
  versioner: Versioner,
): readonly PackagePlan[] => {
  const groups = new Map<string, Intent[]>();
  for (const intent of intents) {
    const key = `${intent.hotfix ? "h" : "n"}::${intent.package}`;
    const existing = groups.get(key);
    if (existing) existing.push(intent);
    else groups.set(key, [intent]);
  }

  const entries: PackagePlan[] = [];
  for (const groupIntents of groups.values()) {
    const first = groupIntents[0];
    if (!first) continue;
    const pkg = first.package;
    const currentVersion = currentVersions[pkg];
    if (currentVersion === undefined) {
      throw new Error(`No current version for package: ${pkg}`);
    }
    const bumps = groupIntents.map((i) => i.bump);
    entries.push({
      package: pkg,
      currentVersion,
      nextVersion: versioner.next(currentVersion, bumps),
      bumps,
      intents: groupIntents,
      hotfix: first.hotfix,
    });
  }

  entries.sort((a, b) => {
    if (a.hotfix !== b.hotfix) return a.hotfix ? -1 : 1;
    return a.package.localeCompare(b.package);
  });

  return entries;
};
