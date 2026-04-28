export type FileReader = {
  readonly readFile: (path: string) => Promise<string>;
  readonly listFiles: (dir: string) => Promise<readonly string[]>;
};
