import type { FileReader } from "./file-reader.js";
import type { Intent } from "./intent.js";
import { parseIntent } from "./parse-intent.js";

const intentIdFromPath = (path: string): string =>
  path.replace(/^.*[/\\]/, "").replace(/\.md$/, "");

export const loadIntents = async (
  intentsDir: string,
  reader: FileReader,
): Promise<readonly Intent[]> => {
  const files = await reader.listFiles(intentsDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));
  return Promise.all(
    mdFiles.map(async (path) => {
      const raw = await reader.readFile(path);
      return parseIntent(raw, intentIdFromPath(path));
    }),
  );
};
