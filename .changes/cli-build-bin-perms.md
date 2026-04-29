---
package: cli
bump: patch
---

build script now sets +x on dist/bin.js so the local dev workspace
symlink in node_modules/.bin/re-kit stays executable after rebuilds.
