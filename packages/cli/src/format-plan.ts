import type { PackagePlan } from "@re-kit/core/package-plan";

const formatEntry = (e: PackagePlan): string => {
  const tag = e.hotfix ? " (hotfix)" : "";
  const lines = [`${e.package}: ${e.currentVersion} → ${e.nextVersion}${tag}`];
  for (const intent of e.intents) {
    const headline = intent.summary.split("\n")[0] ?? "";
    lines.push(`  - ${headline} (${intent.id})`);
  }
  return lines.join("\n");
};

export const formatPlan = (entries: readonly PackagePlan[]): string => {
  if (entries.length === 0) return "No pending changes.";
  return entries.map(formatEntry).join("\n");
};
