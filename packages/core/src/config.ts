import type { Strategy } from "./strategy.js";

export type PackageConfig = {
  readonly name: string;
  readonly path: string;
  readonly strategy: Strategy;
};

export type Config = {
  readonly intentsDir: string;
  readonly packages: readonly PackageConfig[];
};
