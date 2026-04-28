export type TagContext = {
  readonly name: string;
  readonly version: string;
};

export type TagRenderer = string | ((context: TagContext) => string);
