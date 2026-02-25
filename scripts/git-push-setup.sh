#!/usr/bin/env bash
# One-time setup: init git, add remote, first commit, and push to GitHub.
# Run from project root: ./scripts/git-push-setup.sh

set -e
cd "$(dirname "$0")/.."

if [ ! -d .git ] || ! git rev-parse --git-dir &>/dev/null; then
  [ -d .git ] && rm -rf .git
  # Use empty template so git init doesn't need to write hooks (avoids permission errors)
  empty_template=$(mktemp -d 2>/dev/null || echo "${TMPDIR:-/tmp}/git-tpl-$$")
  mkdir -p "$empty_template"
  GIT_TEMPLATE_DIR="$empty_template" git init
  rm -rf "$empty_template" 2>/dev/null || true
  git branch -M main
fi

git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/jphil22000/scholarships.git

git add -A
git status

if ! git diff --cached --quiet; then
  git commit -m "Initial commit: Scholarship Finder app with Vue, SAM backend, S3/CloudFront"
elif ! git rev-parse HEAD &>/dev/null; then
  echo "No changes to commit and no existing commits. Add some files and run again."
  exit 1
else
  echo "Nothing new to commit."
fi

branch=$(git branch --show-current 2>/dev/null || echo "main")
echo "Pushing to origin $branch..."
git push -u origin "$branch"

echo "Done. Repo: https://github.com/jphil22000/scholarships"
