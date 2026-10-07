#!/usr/bin/env bash
# 검증 스크립트 공용 함수. 각 스크립트가 source 한다.
# - 임시 컨테이너는 이름 앞에 teamblog-check- 를 붙이고, 끝나면 볼륨까지 함께 지운다 (docker rm -f -v)

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOCS="${DOCS:-$ROOT/docs}"   # 다른 문서 폴더로 검증하려면 DOCS=경로 scripts/…
EXTRACT="python3 $ROOT/scripts/lib/extract.py"
V1="${V1:-$ROOT/erd/V1__common_schema.sql}"   # 통합 ERD = 기준 스키마 (2026-10-07)
PG_IMAGE="${PG_IMAGE:-postgres:18}"
REDIS_IMAGE="${REDIS_IMAGE:-redis:7-alpine}"
PASS=0; FAIL=0
CONTAINERS=()

cleanup() { for c in "${CONTAINERS[@]:-}"; do [ -n "$c" ] && docker rm -f -v "$c" >/dev/null 2>&1; done; }
trap cleanup EXIT

start_pg() {   # start_pg <이름>
  local name="teamblog-check-$1"; docker rm -f -v "$name" >/dev/null 2>&1
  docker run -d --name "$name" -e POSTGRES_PASSWORD=pw -e TZ=Asia/Seoul "$PG_IMAGE" >/dev/null || { echo "PostgreSQL 컨테이너를 시작하지 못했습니다"; exit 2; }
  CONTAINERS+=("$name"); PG="$name"
  for _ in $(seq 1 60); do docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
  sleep 1
}
start_redis() {
  local name="teamblog-check-$1"; docker rm -f -v "$name" >/dev/null 2>&1
  docker run -d --name "$name" "$REDIS_IMAGE" >/dev/null || { echo "Redis 컨테이너를 시작하지 못했습니다"; exit 2; }
  CONTAINERS+=("$name"); RD="$name"
  for _ in $(seq 1 30); do docker exec "$RD" redis-cli ping >/dev/null 2>&1 && break; sleep 1; done
}
q()  { docker exec "$PG" psql -U postgres -v ON_ERROR_STOP=1 -qtAc "$1" 2>&1; }
qf() { docker exec -i "$PG" psql -U postgres -v ON_ERROR_STOP=1 -q 2>&1; }       # 표준 입력의 SQL 실행
r()  { docker exec "$RD" redis-cli "$@"; }

# check ok|fail "설명" "SQL"  — SQL이 성공(ok)/실패(fail)해야 PASS
check() {
  local expect=$1 desc=$2 sql=$3 out rc
  out=$(q "$sql"); rc=$?
  if { [ "$expect" = ok ] && [ $rc = 0 ]; } || { [ "$expect" = fail ] && [ $rc != 0 ]; }; then
    PASS=$((PASS+1)); echo "PASS  $desc"
  else
    FAIL=$((FAIL+1)); echo "FAIL  $desc"; echo "      ${out:0:300}"
  fi
}
# expect "설명" "실제값" "기대값"
expect() {
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1 ($2)"; else FAIL=$((FAIL+1)); echo "FAIL  $1: 실제 [$2] / 기대 [$3]"; fi
}
summary() { echo; echo "결과: PASS $PASS / FAIL $FAIL"; [ "$FAIL" = 0 ]; }
