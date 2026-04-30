# Changelog

## 0.2.0 - 2026-04-30

### Minor Changes

- StrategyContext now exposes a GitTagReader so strategies can resolve a
  package's current version from git tags. GitOps extends GitTagReader so
  node-side adapters get listTags for free.
