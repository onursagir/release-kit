# Changelog

## 0.1.3 - 2026-04-30

### Patch Changes

- Republish to ship the previously-bumped 0.1.2 work to npm — the original
  Release run was blocked by a stale package-lock.json (since fixed). Also
  realigns the @re-kit/core dep range to ^0.2.0.

## 0.1.2 - 2026-04-30

### Patch Changes

- plan and version commands now thread a GitTagReader through to
  strategies, enabling tag-sourced versioning (see @re-kit/strategy-git-tag).

## 0.1.1 - 2026-04-29

### Patch Changes

- build script now sets +x on dist/bin.js so the local dev workspace
  symlink in node_modules/.bin/re-kit stays executable after rebuilds.
