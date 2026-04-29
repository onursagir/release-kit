import { join } from "node:path";
import type { Config } from "@re-kit/core/config";
import type { FileWriter } from "@re-kit/core/file-writer";
import { parseBump } from "@re-kit/core/parse-bump";
import { renderIntent } from "@re-kit/core/render-intent";

export type AddDeps = {
  readonly writer: FileWriter;
  readonly generateId: () => string;
};

export type AddInput = {
  readonly package: string;
  readonly bump: string;
  readonly summary: string;
  readonly hotfix?: boolean;
};

export type AddResult = {
  readonly id: string;
  readonly path: string;
};

export const runAdd = async (
  config: Config,
  deps: AddDeps,
  input: AddInput,
): Promise<AddResult> => {
  const known = config.packages.find((p) => p.name === input.package);
  if (!known) {
    const names = config.packages.map((p) => p.name).join(", ");
    throw new Error(`Unknown package: ${input.package}. Configured packages: ${names}`);
  }

  const bump = parseBump(input.bump);
  const summary = input.summary.trim();
  if (summary.length === 0) throw new Error("Intent summary cannot be empty");

  const id = deps.generateId();
  const path = join(config.intentsDir, `${id}.md`);
  const content = renderIntent({
    package: input.package,
    bump,
    summary,
    hotfix: input.hotfix,
  });
  await deps.writer.writeFile(path, content);
  return { id, path };
};
