#!/usr/bin/env bash
# 동시 요청에서 반응 수가 실제 행 수와 맞는지, 동시 발행이 한 번만 일어나는지 실제 병렬 실행으로 확인한다.
# 좋아요·취소 SQL은 30-like.md에서 꺼낸다 (없으면 03 대표 쿼리의 좋아요만).
# 사용: scripts/check-concurrency.sh     (Docker 필요)
source "$(dirname "$0")/lib/common.sh"
start_pg conc
docker exec "$PG" psql -U postgres -qc "alter system set max_connections = 200" >/dev/null; docker restart "$PG" >/dev/null
for _ in $(seq 1 60); do docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done; sleep 1
qf < "$V1" || { echo "스키마 적용 실패"; exit 1; }
q "insert into member(handle,nickname) select 'user'||lpad(g::text,3,'0'), '회원'||g from generate_series(1,60) g;
   insert into post(author_id,title,content_md,status,visibility,published_at,first_public_at) values (1,'글','x','PUBLISHED','PUBLIC',now(),now());
   insert into post(author_id,title) values (1,'동시발행')" >/dev/null
PID=$(q "select id from post where title='글'")

if [ -f "$DOCS/30-like.md" ]; then
  LIKE=$($EXTRACT block "$DOCS/30-like.md" sql "WITH ins" | sed -n '/WITH ins/,/;/p')
  UNLIKE=$($EXTRACT block "$DOCS/30-like.md" sql "WITH del" | sed -n '/WITH del/,/;/p')
else
  LIKE=$($EXTRACT block "$DOCS/03-erd.md" sql "ON CONFLICT DO NOTHING RETURNING" | sed -n '/WITH ins/,/;/p'); UNLIKE=""
fi
sub() { echo "$1" | sed "s/:postId/$PID/g; s/:memberId/$2/g"; }
par() { docker exec "$PG" psql -U postgres -qtAc "$1" >/dev/null 2>&1; }
state() { echo "$(q "select like_count from post where id=$PID")/$(q "select count(*) from post_like where post_id=$PID")"; }
M2=$(q "select id from member where handle='user002'")

echo "== 좋아요"
for _ in $(seq 1 20); do par "$(sub "$LIKE" "$M2")" & done; wait
expect "같은 사람이 동시에 좋아요 20번 (수/행)" "$(state)" "1/1"
if [ -n "$UNLIKE" ]; then
  for _ in 1 2 3; do
    for _ in $(seq 1 20); do par "$(sub "$LIKE" "$M2")" & par "$(sub "$UNLIKE" "$M2")" & done; wait
    s=$(state); expect "좋아요·취소 섞어 40번 → 수 = 행" "$([ "${s%/*}" = "${s#*/}" ] && echo 일치 || echo "$s")" "일치"
  done
fi
q "delete from post_like; update post set like_count=0 where id=$PID" >/dev/null
for m in $(q "select id from member where id between 3 and 52"); do par "$(sub "$LIKE" "$m")" & done; wait
expect "서로 다른 50명이 동시에 좋아요" "$(state)" "50/50"

echo; echo "== 동시 발행 (05: 행 잠금 + 버전 확인)"
DP=$(q "select id from post where title='동시발행'")
for _ in $(seq 1 20); do par "begin; select edit_version from post where id=$DP for update; update post set status='PUBLISHED', published_at=coalesce(published_at,now()), first_public_at=coalesce(first_public_at,now()), edit_version=edit_version+1 where id=$DP and edit_version=0; commit;" & done; wait
expect "같은 기준 버전으로 동시에 20번 발행 → edit_version" "$(q "select edit_version from post where id=$DP")" "1"

summary
