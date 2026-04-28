import type { MrScope } from "./mr-scope.js";

export type MrRef = {
  readonly id: string | number;
  readonly url: string;
};

export type MrBody = {
  readonly title: string;
  readonly body: string;
};

export type FindMrInput = {
  readonly scope: MrScope;
  readonly branch: string;
};

export type OpenMrInput = MrBody & {
  readonly scope: MrScope;
  readonly branch: string;
  readonly base?: string;
};

export type PlatformAdapter = {
  readonly name: string;
  readonly findOpenReleaseMr: (input: FindMrInput) => Promise<MrRef | null>;
  readonly openReleaseMr: (input: OpenMrInput) => Promise<MrRef>;
  readonly updateReleaseMr: (ref: MrRef, body: MrBody) => Promise<void>;
};
