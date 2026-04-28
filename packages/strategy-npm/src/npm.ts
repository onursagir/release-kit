import { join } from "node:path";
import type { Strategy } from "@release-kit/core/strategy";

export const npm = (): Strategy => ({
  name: "npm",
  readVersion: async (ctx) => {
    const raw = await ctx.reader.readFile(join(ctx.path, "package.json"));
    const parsed = JSON.parse(raw) as { version?: unknown };
    if (typeof parsed.version !== "string") {
      throw new Error(`No 'version' string in ${ctx.path}/package.json`);
    }
    return parsed.version;
  },
  writeVersion: async (ctx, next) => {
    const path = join(ctx.path, "package.json");
    const raw = await ctx.reader.readFile(path);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    parsed.version = next;
    await ctx.writer.writeFile(path, `${JSON.stringify(parsed, null, 2)}\n`);
  },
});
