import matter from "gray-matter";
import type { Intent } from "./intent.js";
import { parseBump } from "./parse-bump.js";

export const parseIntent = (raw: string, id: string): Intent => {
  if (!matter.test(raw)) {
    throw new Error(`Intent ${id}: missing YAML frontmatter`);
  }
  const { data, content } = matter(raw);

  if (typeof data.package !== "string" || data.package.length === 0) {
    throw new Error(`Intent ${id}: missing or invalid 'package'`);
  }
  if (typeof data.bump !== "string") {
    throw new Error(`Intent ${id}: missing or invalid 'bump'`);
  }
  const hotfix = data.hotfix ?? false;
  if (typeof hotfix !== "boolean") {
    throw new Error(`Intent ${id}: 'hotfix' must be a boolean`);
  }

  const summary = content.trim();
  if (summary.length === 0) {
    throw new Error(`Intent ${id}: summary body is empty`);
  }

  return {
    id,
    package: data.package,
    bump: parseBump(data.bump),
    hotfix,
    summary,
  };
};
