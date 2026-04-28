import type { Platform } from "./platform.js";

const SCP_LIKE = /^[^@/\s]+@([^:]+):/;

const extractHost = (url: string): string | null => {
  const scp = SCP_LIKE.exec(url);
  if (scp) return scp[1] ?? null;
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
};

export const detectPlatform = (remoteUrl: string): Platform => {
  const host = extractHost(remoteUrl);
  if (!host) {
    throw new Error(`Cannot parse git remote URL: ${remoteUrl}`);
  }
  if (host === "github.com") return "github";
  if (host.includes("gitlab")) return "gitlab";
  throw new Error(
    `Cannot detect platform from remote URL: ${remoteUrl}. Set 'platform' explicitly in your config.`,
  );
};
