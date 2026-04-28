export type PackageConfig = {
  readonly name: string;
  readonly path: string;
};

export type Config = {
  readonly intentsDir: string;
  readonly packages: readonly PackageConfig[];
};
