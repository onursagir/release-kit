import { resolve } from "node:path";
import type { Config } from "@re-kit/core/config";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

export const loadConfig = async (configPath: string): Promise<Config> => {
  const absolute = resolve(configPath);
  const mod = (await jiti.import(absolute)) as { default?: Config } | Config;
  const candidate =
    typeof mod === "object" && mod !== null && "default" in mod && mod.default
      ? mod.default
      : (mod as Config);

  if (
    !candidate ||
    typeof candidate !== "object" ||
    typeof (candidate as Config).intentsDir !== "string" ||
    !Array.isArray((candidate as Config).packages)
  ) {
    throw new Error(
      `Invalid config at ${configPath}: expected an object with 'intentsDir' (string) and 'packages' (array)`,
    );
  }
  return candidate as Config;
};
