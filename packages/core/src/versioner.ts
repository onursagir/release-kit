import type { Bump } from "./parse-bump.js";

export type Versioner = {
  readonly name: string;
  readonly next: (current: string, bumps: readonly Bump[]) => string;
  readonly compare?: (a: string, b: string) => number;
};
