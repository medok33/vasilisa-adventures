#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_route="$project_dir/app/api/progress/route.ts"
backup_route="$(mktemp)"

restore_route() {
  cp "$backup_route" "$target_route"
  rm -f "$backup_route"
}
trap restore_route EXIT

cp "$target_route" "$backup_route"
cp "$project_dir/vds/progress-route.ts" "$target_route"
cd "$project_dir"
NEXT_TELEMETRY_DISABLED=1 npx next build
