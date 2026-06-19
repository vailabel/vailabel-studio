# Contributing

## Apps

- `apps/studio`: Tauri desktop app built with React and Rust
- `apps/studio/src/types/core.ts`: Studio-owned TypeScript models
- `apps/web`: documentation site

## Setup

```bash
yarn install
```

## Common Commands

```bash
yarn desktop
yarn studio
yarn build
yarn typecheck
yarn lint
yarn test
```

## Commit messages

This repo follows the [Conventional Commits](https://www.conventionalcommits.org) spec, enforced by
commitlint through a Husky `commit-msg` hook. The easiest way to write a valid message:

```bash
yarn commit        # interactive prompt (commitizen) — builds the message for you
```

Or commit as usual — the hook validates the format and rejects malformed messages:

```
<type>(<optional scope>): <subject>

feat(studio): add polygon keypoint tool
fix(ai): handle empty YOLO detection result
docs: update install instructions
```

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.

## Guidelines

- Use conventional commits
- Add or update tests for behavior changes
- Update docs when user-facing behavior changes
- Keep new desktop work in Tauri + Rust only
