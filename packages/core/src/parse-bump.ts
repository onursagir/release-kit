export type Bump = "major" | "minor" | "patch";

const BUMPS: readonly string[] = ["major", "minor", "patch"];

export const parseBump = (raw: string): Bump => {
  const normalized = raw.trim().toLowerCase();
  if (BUMPS.includes(normalized)) return normalized as Bump;
  throw new Error(`Invalid bump: ${raw}`);
};
