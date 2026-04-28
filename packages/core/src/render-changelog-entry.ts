import type { PackagePlan } from "./package-plan.js";
import type { Bump } from "./parse-bump.js";

const BUMP_HEADERS: Record<Bump, string> = {
  major: "Major Changes",
  minor: "Minor Changes",
  patch: "Patch Changes",
};

const BUMP_ORDER: readonly Bump[] = ["major", "minor", "patch"];

const indentContinuation = (s: string): string => s.replace(/\n/g, "\n  ");

export const renderChangelogEntry = (plan: PackagePlan, date?: string): string => {
  const suffix: string[] = [];
  if (date) suffix.push(` - ${date}`);
  if (plan.hotfix) suffix.push(" (hotfix)");

  const lines: string[] = [`## ${plan.nextVersion}${suffix.join("")}`];

  for (const bump of BUMP_ORDER) {
    const intents = plan.intents.filter((i) => i.bump === bump);
    if (intents.length === 0) continue;
    lines.push("", `### ${BUMP_HEADERS[bump]}`, "");
    for (const intent of intents) {
      lines.push(`- ${indentContinuation(intent.summary)}`);
    }
  }

  return `${lines.join("\n")}\n`;
};
