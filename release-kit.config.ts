import type { Config } from "@release-kit/core/config";
import { npm } from "@release-kit/strategy-npm/npm";

const config: Config = {
  intentsDir: ".changes",
  packages: [
    { name: "core", path: "packages/core", strategy: npm() },
    { name: "platform-github", path: "packages/platform-github", strategy: npm() },
    { name: "strategy-npm", path: "packages/strategy-npm", strategy: npm() },
    { name: "cli", path: "packages/cli", strategy: npm() },
  ],
};

export default config;
