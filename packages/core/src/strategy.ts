import type { FileReader } from "./file-reader.js";
import type { FileWriter } from "./file-writer.js";
import type { GitTagReader } from "./git-tag-reader.js";

export type StrategyContext = {
  readonly name: string;
  readonly path: string;
  readonly reader: FileReader;
  readonly git: GitTagReader;
};

export type StrategyWriteContext = StrategyContext & {
  readonly writer: FileWriter;
};

export type Strategy = {
  readonly name: string;
  readonly readVersion: (ctx: StrategyContext) => Promise<string>;
  readonly writeVersion: (ctx: StrategyWriteContext, next: string) => Promise<void>;
};
