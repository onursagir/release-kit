export type MrScope = {
  readonly kind: "release" | "hotfix";
  readonly package?: string;
};
