---
package: cli
bump: patch
---

plan and version commands now thread a GitTagReader through to
strategies, enabling tag-sourced versioning (see @re-kit/strategy-git-tag).
