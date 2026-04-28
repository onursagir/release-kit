import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitAuthor, GitOps } from "@release-kit/core/git-ops";

const exec = promisify(execFile);

export type NodeGitOpsOptions = {
  readonly cwd?: string;
};

export const nodeGitOps = (opts: NodeGitOpsOptions = {}): GitOps => {
  const cwd = opts.cwd ?? process.cwd();
  const run = async (args: readonly string[], extraEnv?: Record<string, string>): Promise<string> => {
    const { stdout } = await exec("git", args as string[], {
      cwd,
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
    });
    return stdout;
  };

  return {
    headRef: async () => (await run(["rev-parse", "HEAD"])).trim(),
    currentBranch: async () => (await run(["rev-parse", "--abbrev-ref", "HEAD"])).trim(),
    createOrResetBranch: async (name, fromRef) => {
      await run(["checkout", "-B", name, fromRef]);
    },
    addAll: async () => {
      await run(["add", "-A"]);
    },
    hasStagedChanges: async () => {
      try {
        await run(["diff", "--cached", "--quiet"]);
        return false;
      } catch {
        return true;
      }
    },
    commit: async (message, author) => {
      await run(
        ["commit", "-m", message],
        commitEnv(author),
      );
    },
    push: async (branch, options) => {
      const args = ["push", "origin", branch];
      if (options?.force) args.push("--force-with-lease");
      await run(args);
    },
  };
};

const commitEnv = (author?: GitAuthor): Record<string, string> | undefined =>
  author
    ? {
        GIT_AUTHOR_NAME: author.name,
        GIT_AUTHOR_EMAIL: author.email,
        GIT_COMMITTER_NAME: author.name,
        GIT_COMMITTER_EMAIL: author.email,
      }
    : undefined;
