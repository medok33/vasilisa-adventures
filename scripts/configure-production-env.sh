#!/usr/bin/env bash
set -euo pipefail

umask 077

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$project_dir/vds/.env"
backup_root="/home/zapolnaya28/vasilisa-backups"

read_secret() {
  local prompt="$1"
  local target="$2"
  local value
  IFS= read -r -s -p "$prompt" value
  printf '\n'
  printf -v "$target" '%s' "$value"
}

read_secret "Логин сайта: " site_user
read_secret "Пароль сайта: " site_password
read_secret "Телефон папы: " dad_phone
read_secret "Ссылка VK папы: " dad_vk_url
read_secret "Ссылка MAX папы: " dad_max_url

[[ -n "$site_user" ]] || { printf 'Логин не задан.\n' >&2; exit 1; }
(( ${#site_password} >= 8 )) || { printf 'Пароль должен содержать не менее 8 символов.\n' >&2; exit 1; }
[[ "$site_user" =~ ^[A-Za-z0-9_.@-]{1,128}$ ]] || { printf 'Логин содержит неподдерживаемые символы.\n' >&2; exit 1; }
[[ "$site_password" =~ ^[A-Za-z0-9_@%+=:,./*-]{8,128}$ ]] || { printf 'Пароль содержит неподдерживаемые символы.\n' >&2; exit 1; }
[[ "$dad_phone" =~ ^\+?[0-9\ \(\)-]{7,24}$ ]] || { printf 'Телефон имеет неверный формат.\n' >&2; exit 1; }
[[ "$dad_vk_url" =~ ^https://(www\.|m\.)?vk\.(com|ru)/[^[:space:]]+$ ]] || { printf 'Нужна HTTPS-ссылка на vk.com или vk.ru.\n' >&2; exit 1; }
[[ "$dad_max_url" =~ ^https://(www\.)?max\.ru/[^[:space:]]+$ ]] || { printf 'Нужна HTTPS-ссылка на max.ru.\n' >&2; exit 1; }

site_secret="$(openssl rand -hex 32)"
app_revision="$(git -C "$project_dir" rev-parse HEAD)"
tmp_file="$(mktemp "$project_dir/vds/.env.tmp.XXXXXX")"
trap 'rm -f "$tmp_file"' EXIT

printf '%s\n' \
  "SITE_AUTH_USERNAME=$site_user" \
  "SITE_AUTH_PASSWORD=$site_password" \
  "SITE_AUTH_SECRET=$site_secret" \
  "DAD_PHONE=$dad_phone" \
  "DAD_VK_URL=$dad_vk_url" \
  "DAD_MAX_URL=$dad_max_url" \
  "APP_REVISION=$app_revision" >"$tmp_file"

if [[ -f "$env_file" ]]; then
  mkdir -p "$backup_root"
  backup_file="$backup_root/env-pre-$(date +%Y%m%d-%H%M%S)"
  cp -a "$env_file" "$backup_file"
  chmod 600 "$backup_file"
fi

chown root:root "$tmp_file"
chmod 600 "$tmp_file"
mv -f "$tmp_file" "$env_file"
trap - EXIT

unset site_user site_password site_secret dad_phone dad_vk_url dad_max_url

printf 'Закрытое окружение записано в %s (права 600).\n' "$env_file"
printf 'APP_REVISION=%s\n' "$app_revision"
