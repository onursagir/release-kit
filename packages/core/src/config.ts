import type { Strategy } from "./strategy.js";

export type PackageConfig = {
  readonly name: string;
  readonly path: string;
  readonly strategy: Strategy;
};

export type ReleasesConfig = {
  readonly mode?: "isolated" | "combined";
  readonly branchPrefix?: string;
};

export type Config = {
  readonly intentsDir: string;
  readonly packages: readonly PackageConfig[];
  readonly releases?: ReleasesConfig;
};
