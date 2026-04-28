import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { FileReader } from "@release-kit/core/file-reader";

export const nodeFileReader: FileReader = {
  readFile: (path) => readFile(path, "utf-8"),
  listFiles: async (dir) => {
    try {
      const names = await readdir(dir);
      return names.map((n) => join(dir, n));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  },
};
