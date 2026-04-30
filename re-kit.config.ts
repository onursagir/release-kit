import type { Config } from "@re-kit/core/config";
import { gitTag } from "@re-kit/strategy-git-tag/git-tag";
import { npm } from "@re-kit/strategy-npm/npm";

const config: Config = {
  intentsDir: ".changes",
  packages: [
    { name: "core", path: "packages/core", strategy: npm() },
    { name: "platform-github", path: "packages/platform-github", strategy: npm() },
    { name: "strategy-npm", path: "packages/strategy-npm", strategy: npm() },
    { name: "strategy-rekit", path: "packages/strategy-rekit", strategy: npm() },
    { name: "strategy-git-tag", path: "packages/strategy-git-tag", strategy: npm() },
    { name: "cli", path: "packages/cli", strategy: npm() },
    { name: "actions", path: "actions", strategy: gitTag() },
  ],
};

export default config;
