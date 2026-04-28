import type { FileReader } from "./file-reader.js";
import type { FileWriter } from "./file-writer.js";

export type StrategyContext = {
  readonly name: string;
  readonly path: string;
  readonly reader: FileReader;
};

export type StrategyWriteContext = StrategyContext & {
  readonly writer: FileWriter;
};

export type Strategy = {
  readonly name: string;
  readonly readVersion: (ctx: StrategyContext) => Promise<string>;
  readonly writeVersion: (ctx: StrategyWriteContext, next: string) => Promise<void>;
};
