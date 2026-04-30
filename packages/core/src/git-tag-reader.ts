export type GitTagReader = {
  readonly listTags: (pattern: string) => Promise<readonly string[]>;
};
