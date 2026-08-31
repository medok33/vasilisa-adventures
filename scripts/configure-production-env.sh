#!/usr/bin/env bash
set -euo pipefail

umask 077

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$project_dir/.env"
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
[[ "$dad_phone" =~ ^\+?[0-9\ \(\)-]{7,24}$ ]] || { printf 'Телефон имеет неверный формат.\n' >&2; exit 1; }
[[ "$dad_vk_url" =~ ^https://(www\.|m\.)?vk\.(com|ru)/[^[:space:]]+$ ]] || { printf 'Нужна HTTPS-ссылка на vk.com или vk.ru.\n' >&2; exit 1; }
[[ "$dad_max_url" =~ ^https://(www\.)?max\.ru/[^[:space:]]+$ ]] || { printf 'Нужна HTTPS-ссылка на max.ru.\n' >&2; exit 1; }

site_secret="$(openssl rand -hex 32)"
app_revision="$(git -C "$project_dir" rev-parse HEAD)"
tmp_file="$(mktemp "$project_dir/.env.tmp.XXXXXX")"
trap 'rm -f "$tmp_file"' EXIT

export SITE_AUTH_USERNAME="$site_user"
export SITE_AUTH_PASSWORD="$site_password"
export SITE_AUTH_SECRET="$site_secret"
export DAD_PHONE="$dad_phone"
export DAD_VK_URL="$dad_vk_url"
export DAD_MAX_URL="$dad_max_url"
export APP_REVISION="$app_revision"

node - "$tmp_file" <<'NODE'
const fs = require("node:fs");
const path = process.argv[2];
const names = [
  "SITE_AUTH_USERNAME",
  "SITE_AUTH_PASSWORD",
  "SITE_AUTH_SECRET",
  "DAD_PHONE",
  "DAD_VK_URL",
  "DAD_MAX_URL",
  "APP_REVISION",
];
const lines = names.map((name) => {
  const value = process.env[name];
  if (!value || /[\r\n]/.test(value)) throw new Error(`Invalid ${name}`);
  return `${name}=${JSON.stringify(value)}`;
});
fs.writeFileSync(path, `${lines.join("\n")}\n`, { mode: 0o600 });
NODE

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

unset SITE_AUTH_USERNAME SITE_AUTH_PASSWORD SITE_AUTH_SECRET
unset DAD_PHONE DAD_VK_URL DAD_MAX_URL APP_REVISION
unset site_user site_password site_secret dad_phone dad_vk_url dad_max_url

printf 'Закрытое окружение записано в %s (права 600).\n' "$env_file"
printf 'APP_REVISION=%s\n' "$app_revision"
