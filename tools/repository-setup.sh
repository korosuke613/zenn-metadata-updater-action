#!/usr/bin/env bash

set -euo pipefail

source ./.env

if ! test -v GH_TOKEN; then
  echo "GH_TOKEN is already set"
  exit 1
fi

# PRIVATE_KEY_PATH ファイルが存在しない場合はエラー終了する
if [ ! -f $GH_APP_PRIVATE_KEY_PATH ]; then
  echo "File not found!: $GH_APP_PRIVATE_KEY_PATH"
  exit 1
fi

gh variable set GH_APP_NAME --body "$GH_APP_NAME"
gh variable set GH_APP_ID --body "$GH_APP_ID"
gh secret set GH_APP_PRIVATE_KEY < $GH_APP_PRIVATE_KEY_PATH

# GitHub Actions でプルリクエストを作れるようにする
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/:owner/:repo/actions/permissions/workflow \
  -f default_workflow_permissions='read' \
  -F can_approve_pull_request_reviews=true
