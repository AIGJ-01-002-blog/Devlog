#!/usr/bin/env bash
# 파일 저장소(MinIO) 검증: 23 §2-3의 Presigned 검증 7가지 + 익명 쓰기·경로·CORS 4가지.
# 로컬 개발용 MinIO 이미지(04 §6-1)를 띄워 버킷 정책·앱 전용 키·CORS를 설정한 뒤 시험한다.
# 운영은 NHN이 제공한 MinIO를 쓰므로, 같은 시험을 NHN 엔드포인트에 돌리려면 S3_ENDPOINT 등을 바꿔 lib/presign_check.py만 실행한다.
source "$(dirname "$0")/lib/common.sh"
STORAGE_IMAGE="${STORAGE_IMAGE:-pgsty/silo:RELEASE.2026-09-16T00-00-00Z}"
MC_IMAGE="${MC_IMAGE:-pgsty/mc:RELEASE.2026-09-16T00-00-00Z}"
PY_IMAGE="${PY_IMAGE:-python:3.12-slim}"
NET=teamblog-check-storage-net; ST=teamblog-check-storage; ORIGIN=http://localhost:8080
docker network rm "$NET" >/dev/null 2>&1; docker network create "$NET" >/dev/null || exit 2
trap 'cleanup; docker network rm "$NET" >/dev/null 2>&1' EXIT
docker rm -f -v "$ST" >/dev/null 2>&1
docker run -d --name "$ST" --network "$NET" -e MINIO_ROOT_USER=rootadmin -e MINIO_ROOT_PASSWORD=rootadmin-secret \
  -e MINIO_API_CORS_ALLOW_ORIGIN="$ORIGIN" "$STORAGE_IMAGE" server /data >/dev/null || { echo "저장소 컨테이너를 시작하지 못했습니다"; exit 2; }
CONTAINERS+=("$ST")
for _ in $(seq 1 30); do docker exec "$ST" sh -c 'exit 0' 2>/dev/null && docker run --rm --network "$NET" --entrypoint sh "$MC_IMAGE" -c "mc alias set l http://$ST:9000 rootadmin rootadmin-secret" >/dev/null 2>&1 && break; sleep 1; done
echo "== 저장소 이미지: $STORAGE_IMAGE ($(docker exec "$ST" silo --version 2>/dev/null | head -1))"
docker run --rm --network "$NET" --entrypoint sh "$MC_IMAGE" -c "
set -e
mc alias set l http://$ST:9000 rootadmin rootadmin-secret >/dev/null
mc mb l/blog >/dev/null
cat > /tmp/anon.json <<'J'
{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":[\"*\"]},\"Action\":[\"s3:GetObject\"],\"Resource\":[\"arn:aws:s3:::blog/images/*\"]}]}
J
mc anonymous set-json /tmp/anon.json l/blog >/dev/null
cat > /tmp/app.json <<'J'
{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:PutObject\",\"s3:GetObject\",\"s3:DeleteObject\"],\"Resource\":[\"arn:aws:s3:::blog/*\"]}]}
J
mc admin user add l blogapp blogapp-secret-123 >/dev/null
mc admin policy create l blog-app /tmp/app.json >/dev/null
mc admin policy attach l blog-app --user blogapp >/dev/null
" || { echo "버킷·정책 설정 실패"; exit 1; }
echo "== 설정: 버킷 blog, 익명 읽기 images/* 만, 앱 전용 키(Put/Get/Delete), CORS 허용 출처 $ORIGIN"
docker run --rm --network "$NET" -e S3_ENDPOINT="http://$ST:9000" -e APP_KEY=blogapp -e APP_SECRET=blogapp-secret-123 \
  -e BUCKET=blog -e SITE_ORIGIN="$ORIGIN" -e PIP_DISABLE_PIP_VERSION_CHECK=1 \
  -v "$ROOT/scripts/lib/presign_check.py:/check.py:ro" "$PY_IMAGE" \
  sh -c 'pip install -q boto3 >/dev/null 2>&1 && python /check.py'
