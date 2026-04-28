import type { FileReader } from "./file-reader.js";

export type StrategyContext = {
  readonly name: string;
  readonly path: string;
  readonly reader: FileReader;
};

export type Strategy = {
  readonly name: string;
  readonly readVersion: (ctx: StrategyContext) => Promise<string>;
};
