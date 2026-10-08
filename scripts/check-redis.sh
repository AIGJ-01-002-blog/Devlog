#!/usr/bin/env bash
# 문서에 적힌 Redis Lua 스크립트를 그대로 꺼내 실제 Redis에서 실행해 본다.
#   04 자동 저장(버전 확인 후 저장) / 05 발행 후 자동 저장 키 조건부 삭제 / 31 조회수 중복 판정(있으면)
# 사용: scripts/check-redis.sh       (Docker 필요)
source "$(dirname "$0")/lib/common.sh"
require_docs
start_redis redis
load() { local t; t=$(mktemp) && $EXTRACT block "$1" lua "$2" > "$t" && docker cp "$t" "$RD:/$3.lua" >/dev/null; rm -f "$t"; }   # 고정 경로 대신 임시 파일 (동시 실행·찌꺼기 방지)

echo "== 04 자동 저장 Lua (버전이 같을 때만 저장)"
load "$DOCS/04-draft-and-image.md" "nextVersion" autosave
L() { r --eval /autosave.lua autosave:post:1 autosave:dirty , "$@" | tr '\n' ' ' | sed 's/ $//'; }
expect "키 없음, 탭A base=0 (DB 버전 0)"    "$(L 7 0 0 t A1 now 86400 1)" "1 1"
expect "탭A base=1"                         "$(L 7 1 0 t A2 now 86400 1)" "1 2"
expect "탭B가 옛 기준 base=1 → 충돌"         "$(L 7 1 0 t B1 now 86400 1)" "0 2"
expect "다른 회원 → 거부"                    "$(L 9 2 0 t X now 86400 1)" "-1 0"
expect "탭B가 덮어쓰기 선택 base=2"          "$(L 7 2 0 t B2 now 86400 1)" "1 3"
expect "저장된 내용"                         "$(r hget autosave:post:1 contentMd)" "B2"
expect "DB 반영 대기 목록"                   "$(r smembers autosave:dirty)" "1"

echo; echo "== 05 발행 후 자동 저장 키 조건부 삭제"
load "$DOCS/05-publish.md" "DEL" pubdel
r hset autosave:post:2 version 13 >/dev/null
expect "발행 버전 13, 자동 저장 13 → 삭제"   "$(r --eval /pubdel.lua autosave:post:2 , 13)" "1"
r hset autosave:post:2 version 14 >/dev/null
expect "발행 중 들어온 버전 14 → 보존"       "$(r --eval /pubdel.lua autosave:post:2 , 13)" "0"

echo; echo "== 31 조회수 중복 판정 Lua"
if [ -f "$DOCS/31-view-count.md" ]; then
  load "$DOCS/31-view-count.md" "HINCRBY" view
  V() { r --eval /view.lua "view:seen:$1:$2" view:pending:20261006 , "$3" "$4" "$1" >/dev/null; }
  for _ in 1 2 3 4 5 6 7; do V 1 v1 86400 1; done
  expect "기본(24시간 1회): 같은 방문자 7번"   "$(r hget view:pending:20261006 1)" "1"
  for _ in 1 2 3 4 5 6 7; do V 2 v1 1800 5; done
  expect "30분 5회 설정: 같은 방문자 7번"     "$(r hget view:pending:20261006 2)" "5"
  for _ in $(seq 1 50); do V 3 burst 86400 1 & done; wait
  expect "동시에 50번"                         "$(r hget view:pending:20261006 3)" "1"
else echo "   (31-view-count.md 없음 — 건너뜀)"; fi

summary
