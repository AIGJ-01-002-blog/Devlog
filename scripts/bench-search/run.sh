#!/usr/bin/env bash
# 33 문서의 검색 방식을 실제 스키마 + 글 10만 개(본문 평균 약 2,000자)로 실행해 결과와 속도를 확인한다. (Docker 필요, 약 1분)
# 스키마는 통합 ERD(V1). 33-search.md §6의 검색 인덱스가 V1에 모두 들어 있는지 확인한 뒤 실행한다.
source "$(dirname "$0")/../lib/common.sh"
require_docs
[ -f "$DOCS/33-search.md" ] || { echo "33-search.md가 없어 건너뜁니다"; exit 0; }
start_pg search
qf < "$V1" || exit 1
for ix in $($EXTRACT block "$DOCS/33-search.md" sql "CREATE EXTENSION IF NOT EXISTS pg_trgm" | grep -oE 'CREATE INDEX [a-z_]+' | cut -d" " -f3); do
  [ "$(q "select count(*) from pg_indexes where indexname='$ix'")" = 1 ] || { echo "33 §6 인덱스 $ix가 V1에 없음"; exit 1; }
done
qf < "$(dirname "$0")/load-data.sql" || exit 1
q "vacuum analyze" >/dev/null
echo "글 $(q 'select count(*) from post')개, 본문 평균 $(q 'select round(avg(length(content_md))) from post')자"
PG="$PG" python3 "$(dirname "$0")/search.py"
