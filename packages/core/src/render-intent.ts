import type { Bump } from "./parse-bump.js";

export type RenderIntentInput = {
  readonly package: string;
  readonly bump: Bump;
  readonly summary: string;
  readonly hotfix?: boolean;
};

export const renderIntent = (input: RenderIntentInput): string => {
  const lines: string[] = ["---", `package: ${input.package}`, `bump: ${input.bump}`];
  if (input.hotfix) lines.push("hotfix: true");
  lines.push("---", "", input.summary.trim(), "");
  return lines.join("\n");
};
