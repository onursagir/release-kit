---
package: core
bump: minor
---

StrategyContext now exposes a GitTagReader so strategies can resolve a
package's current version from git tags. GitOps extends GitTagReader so
node-side adapters get listTags for free.
