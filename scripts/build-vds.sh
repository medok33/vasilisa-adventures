#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_route="$project_dir/app/api/progress/route.ts"
backup_route="$(mktemp)"
learning_route="$project_dir/app/api/learning/route.ts"
learning_backup="$(mktemp)"

restore_route() {
  cp "$backup_route" "$target_route"
  cp "$learning_backup" "$learning_route"
  rm -f "$backup_route"
  rm -f "$learning_backup"
}
trap restore_route EXIT

cp "$target_route" "$backup_route"
cp "$learning_route" "$learning_backup"
cp "$project_dir/vds/progress-route.ts" "$target_route"
cp "$project_dir/vds/learning-route.ts" "$learning_route"
cd "$project_dir"
NEXT_TELEMETRY_DISABLED=1 npx next build
