export type FileWriter = {
  readonly writeFile: (path: string, content: string) => Promise<void>;
  readonly deleteFile: (path: string) => Promise<void>;
};
