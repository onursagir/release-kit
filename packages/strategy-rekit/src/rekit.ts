import { join } from "node:path";
import type { Strategy } from "@re-kit/core/strategy";

const FILENAME = "re-kit.json";

export const rekit = (): Strategy => ({
  name: "rekit",
  readVersion: async (ctx) => {
    const raw = await ctx.reader.readFile(join(ctx.path, FILENAME));
    const parsed = JSON.parse(raw) as { version?: unknown };
    if (typeof parsed.version !== "string") {
      throw new Error(`No 'version' string in ${ctx.path}/${FILENAME}`);
    }
    return parsed.version;
  },
  writeVersion: async (ctx, next) => {
    const path = join(ctx.path, FILENAME);
    const raw = await ctx.reader.readFile(path);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    parsed.version = next;
    await ctx.writer.writeFile(path, `${JSON.stringify(parsed, null, 2)}\n`);
  },
});
