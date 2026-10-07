#!/usr/bin/env bash
# overlay의 secret.env.example을 바탕으로 비밀번호·키를 임의 값으로 채운 secret.env를 만든다.
# 사용: deploy/scripts/gen-secret-env.sh selfhosted   (이미 있으면 덮어쓰지 않는다)
# OAuth·SMTP 같은 외부 값은 예시 그대로 두므로 직접 채운다.
set -euo pipefail
overlay="${1:?overlay 이름이 필요합니다 (예: selfhosted)}"
dir="$(cd "$(dirname "$0")/../k8s/overlays/$overlay" && pwd)"
out="$dir/secret.env"
if [ -e "$out" ]; then echo "$out 이 이미 있습니다. 지우고 다시 실행하세요." >&2; exit 1; fi

rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

umask 077
while IFS= read -r line; do
  case "$line" in
    DB_PASSWORD=*|REDIS_PASSWORD=*|S3_SECRET_KEY=*) echo "${line%%=*}=$(rand 32)" ;;
    CURSOR_SECRET=*) echo "CURSOR_SECRET=$(rand 64)" ;;
    *) echo "$line" ;;
  esac
done < "$dir/secret.env.example" > "$out"
echo "만들었습니다: $out (GITHUB_CLIENT_*·GOOGLE_*·SMTP_*는 직접 채우세요)"
