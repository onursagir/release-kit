# Changelog

## 0.1.2 - 2026-04-30

### Patch Changes

- plan and version commands now thread a GitTagReader through to
  strategies, enabling tag-sourced versioning (see @re-kit/strategy-git-tag).

## 0.1.1 - 2026-04-29

### Patch Changes

- build script now sets +x on dist/bin.js so the local dev workspace
  symlink in node_modules/.bin/re-kit stays executable after rebuilds.
