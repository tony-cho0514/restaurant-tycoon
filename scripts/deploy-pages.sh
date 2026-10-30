#!/usr/bin/env bash
# GitHub Pages 배포: 빌드 결과(dist)를 따로 만든 임시 저장소에서 gh-pages 브랜치로 올린다.
# (작업 트리를 건드리지 않아 윈도우 파일 잠금에 걸리지 않는다.)
set -euo pipefail
cd "$(dirname "$0")/.."
remote=$(git remote get-url origin)
rev=$(git rev-parse --short HEAD)
GITHUB_PAGES=1 npm run build
touch dist/.nojekyll
(
  cd dist
  rm -rf .git
  git init -q -b gh-pages
  git add -A
  git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" commit -qm "deploy: $rev"
  git push -qf "$remote" gh-pages:gh-pages
  rm -rf .git
)
echo "배포 완료: https://tony-cho0514.github.io/restaurant-tycoon/"
