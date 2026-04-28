import type { Intent } from "@re-kit/core/intent";

export const formatStatus = (intents: readonly Intent[]): string => {
  if (intents.length === 0) return "No pending intents.";

  const byPackage = new Map<string, Intent[]>();
  for (const intent of intents) {
    const arr = byPackage.get(intent.package) ?? [];
    arr.push(intent);
    byPackage.set(intent.package, arr);
  }

  const packages = [...byPackage.keys()].sort();
  const intentWord = intents.length === 1 ? "intent" : "intents";
  const packageWord = packages.length === 1 ? "package" : "packages";
  const header = `${intents.length} pending ${intentWord} across ${packages.length} ${packageWord}:`;

  const sections = packages.map((pkg) => {
    const items = byPackage.get(pkg) ?? [];
    const lines = [`${pkg} (${items.length}):`];
    for (const intent of items) {
      const headline = intent.summary.split("\n")[0] ?? "";
      const tag = intent.hotfix ? " [hotfix]" : "";
      lines.push(`  ${intent.bump.padEnd(5)}  ${headline} (${intent.id})${tag}`);
    }
    return lines.join("\n");
  });

  return [header, "", ...sections].join("\n");
};
