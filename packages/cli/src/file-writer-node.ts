import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { FileWriter } from "@release-kit/core/file-writer";

export const nodeFileWriter: FileWriter = {
  writeFile: async (path, content) => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf-8");
  },
  deleteFile: (path) => unlink(path),
};
