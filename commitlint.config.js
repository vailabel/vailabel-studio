// Commit message linting — enforces the Conventional Commits spec.
// Runs automatically on every commit via the .husky/commit-msg hook.
//
//   Format:  <type>(<optional scope>): <subject>
//   Example: feat(studio): add polygon keypoint tool
//            fix(ai): handle empty YOLO detection result
//
// Allowed types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test
// Docs: https://www.conventionalcommits.org · https://commitlint.js.org
module.exports = {
  extends: ["@commitlint/config-conventional"],
}
