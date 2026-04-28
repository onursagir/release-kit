import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const readNpmVersion = async (packagePath: string): Promise<string> => {
  const raw = await readFile(join(packagePath, "package.json"), "utf-8");
  const parsed = JSON.parse(raw) as { version?: unknown };
  if (typeof parsed.version !== "string") {
    throw new Error(`No 'version' string in ${packagePath}/package.json`);
  }
  return parsed.version;
};
