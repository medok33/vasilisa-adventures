#!/usr/bin/env bash
set -euo pipefail

umask 077

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$project_dir/vds/.env"
backup_root="/home/zapolnaya28/vasilisa-backups"

[[ -f "$env_file" ]] || { printf 'Сначала настройте основное окружение: %s не найден.\n' "$env_file" >&2; exit 1; }

IFS= read -r -p "Логин детского аккаунта: " child_user
IFS= read -r -s -p "Пароль детского аккаунта: " child_password
printf '\n'

[[ "$child_user" =~ ^[A-Za-z0-9_.@-]{1,128}$ ]] || { printf 'Логин содержит неподдерживаемые символы.\n' >&2; exit 1; }
[[ "$child_password" =~ ^[A-Za-z0-9_@%+=:,./*-]{4,128}$ ]] || { printf 'Пароль должен содержать от 4 до 128 поддерживаемых символов.\n' >&2; exit 1; }

mkdir -p "$backup_root"
backup_file="$backup_root/env-pre-child-$(date +%Y%m%d-%H%M%S)"
cp -a "$env_file" "$backup_file"
chmod 600 "$backup_file"

tmp_file="$(mktemp "$project_dir/vds/.env.child.XXXXXX")"
trap 'rm -f "$tmp_file"' EXIT
awk '!/^CHILD_AUTH_USERNAME=/ && !/^CHILD_AUTH_PASSWORD=/' "$env_file" >"$tmp_file"
printf '%s\n' "CHILD_AUTH_USERNAME=$child_user" "CHILD_AUTH_PASSWORD=$child_password" >>"$tmp_file"
chown root:root "$tmp_file"
chmod 600 "$tmp_file"
mv -f "$tmp_file" "$env_file"
trap - EXIT

unset child_user child_password
printf 'Детский аккаунт добавлен в закрытое окружение. Резервная копия: %s\n' "$backup_file"
