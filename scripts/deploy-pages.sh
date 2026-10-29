#!/usr/bin/env bash
# GitHub Pages 배포: 빌드 결과(dist)를 gh-pages 브랜치에 올린다.
set -euo pipefail
cd "$(dirname "$0")/.."
GITHUB_PAGES=1 npm run build
touch dist/.nojekyll
tmp=$(mktemp -d)
git worktree add -f "$tmp" --detach >/dev/null
(
  cd "$tmp"
  git checkout -q --orphan gh-pages-tmp
  git rm -rq --cached . >/dev/null 2>&1 || true
  find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  cp -r "$OLDPWD/dist/." .
  git add -A
  git commit -qm "deploy: $(git -C "$OLDPWD" rev-parse --short HEAD)"
  git push -qf origin HEAD:gh-pages
)
git worktree remove --force "$tmp"
git branch -D gh-pages-tmp >/dev/null 2>&1 || true
echo "배포 완료: https://tony-cho0514.github.io/restaurant-tycoon/"
