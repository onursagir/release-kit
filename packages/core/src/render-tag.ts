import type { TagContext, TagRenderer } from "./tag-renderer.js";

const PLACEHOLDER = /\$\{(\w+)\}/g;

export const renderTag = (renderer: TagRenderer, context: TagContext): string => {
  if (typeof renderer === "function") return renderer(context);
  return renderer.replace(PLACEHOLDER, (_, key: string) => {
    if (key === "name") return context.name;
    if (key === "version") return context.version;
    throw new Error(`Unknown tag template variable: \${${key}}`);
  });
};
