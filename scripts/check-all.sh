#!/usr/bin/env bash
# 모든 검증을 차례로 실행하고 결과를 요약한다. 사용: scripts/check-all.sh   (Docker, Java 21, Python 3 필요)
cd "$(dirname "$0")"
RESULTS=()
run() { local name=$1; shift; echo; echo "################ $name"; if "$@"; then RESULTS+=("PASS  $name"); else RESULTS+=("FAIL  $name"); fi; }
run "DDL·제약조건 (check-ddl.sh)"          ./check-ddl.sh
run "Redis Lua (check-redis.sh)"            ./check-redis.sh
run "동시성 (check-concurrency.sh)"          ./check-concurrency.sh
run "본문 정화 (sanitize/run.sh)"            ./sanitize/run.sh
run "주소·닉네임·AI 캐시 규칙 (proto)"        python3 proto/test_rules.py
run "파일 저장소 (check-storage.sh)"         ./check-storage.sh
run "검색 (bench-search/run.sh)"             ./bench-search/run.sh
echo; echo "================ 요약"; printf '%s\n' "${RESULTS[@]}"
! printf '%s\n' "${RESULTS[@]}" | grep -q '^FAIL'
