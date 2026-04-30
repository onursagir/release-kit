import type { GitTagReader } from "./git-tag-reader.js";

export type GitOps = GitTagReader & {
  readonly headRef: () => Promise<string>;
  readonly currentBranch: () => Promise<string>;
  readonly createOrResetBranch: (name: string, fromRef: string) => Promise<void>;
  readonly addAll: () => Promise<void>;
  readonly hasStagedChanges: () => Promise<boolean>;
  readonly commit: (message: string, author?: GitAuthor) => Promise<void>;
  readonly push: (branch: string, opts?: { readonly force?: boolean }) => Promise<void>;
};

export type GitAuthor = {
  readonly name: string;
  readonly email: string;
};
