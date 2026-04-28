import type { Mr } from "./mr.js";
import type { MrBody } from "./platform-adapter.js";
import { renderChangelogEntry } from "./render-changelog-entry.js";

const MARKER_PREFIX = "<!-- release-kit:";
const MARKER_SUFFIX = " -->";

export const releaseKitMarker = (mr: Mr): string =>
  `${MARKER_PREFIX}scope=${mr.scope.kind}${mr.scope.package ? `:package=${mr.scope.package}` : ""}${MARKER_SUFFIX}`;

export const renderMrBody = (mr: Mr): MrBody => {
  if (mr.packages.length === 0) {
    throw new Error("Cannot render an MR body for an MR with no package plans");
  }

  const kindLabel = mr.scope.kind === "hotfix" ? "Hotfix" : "Release";
  const titleParts = mr.packages.map((p) => `${p.package}@${p.nextVersion}`).join(", ");
  const title = `${kindLabel}: ${titleParts}`;

  const lines: string[] = [
    `## ${kindLabel}`,
    "",
    "This MR was opened by release-kit. Merging it will mark the listed package versions as the new baseline; downstream pipelines pick it up from there.",
    "",
    "### Packages",
    "",
    "| Package | From | To | Bump |",
    "| --- | --- | --- | --- |",
  ];

  for (const p of mr.packages) {
    const bumpLabel = bumpFor(p.bumps);
    lines.push(`| ${p.package} | ${p.currentVersion} | ${p.nextVersion} | ${bumpLabel} |`);
  }

  lines.push("", "### Changelog", "");
  for (const p of mr.packages) {
    if (mr.packages.length > 1) lines.push(`#### ${p.package}`, "");
    lines.push(renderChangelogEntry(p).trimEnd(), "");
  }

  lines.push(releaseKitMarker(mr));

  return { title, body: lines.join("\n") };
};

const PRECEDENCE = { major: 3, minor: 2, patch: 1 } as const;
const bumpFor = (bumps: readonly ("major" | "minor" | "patch")[]): string => {
  let winner: "major" | "minor" | "patch" = "patch";
  for (const b of bumps) if (PRECEDENCE[b] > PRECEDENCE[winner]) winner = b;
  return winner;
};
