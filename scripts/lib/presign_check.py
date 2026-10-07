"""MinIO(S3 호환) 저장소가 23 §2-3 검증과 버킷 정책·CORS 규칙대로 동작하는지 확인한다.
check-storage.sh가 Docker 네트워크 안의 python 컨테이너에서 실행한다. 환경 변수: S3_ENDPOINT, APP_KEY, APP_SECRET, BUCKET, SITE_ORIGIN"""
import os, sys, time, uuid, urllib.request, urllib.error
import boto3
from botocore.config import Config

EP, BUCKET, ORIGIN = os.environ["S3_ENDPOINT"], os.environ["BUCKET"], os.environ["SITE_ORIGIN"]
s3 = boto3.client("s3", endpoint_url=EP, aws_access_key_id=os.environ["APP_KEY"],
                  aws_secret_access_key=os.environ["APP_SECRET"], region_name="us-east-1",
                  config=Config(signature_version="s3v4", s3={"addressing_style": "path"}))   # 04 §4-1: SigV4 + path-style
results = []

def http(method, url, body=None, headers=None):
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req) as r: return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e: return e.code, dict(e.headers), e.read()

def check(no, desc, ok, got):
    results.append(ok); print(f"{'PASS' if ok else 'FAIL'}  {no:>2}. {desc}" + ("" if ok else f"  (got {got})"))

def presign(key, ctype="image/webp", expires=300):
    return s3.generate_presigned_url("put_object", Params={"Bucket": BUCKET, "Key": key, "ContentType": ctype}, ExpiresIn=expires)

key = f"images/2026/10/{uuid.uuid4()}.webp"; data = b"RIFF0000WEBPVP8 fake-image"
url = presign(key)
st, _, _ = http("PUT", url, data, {"Content-Type": "image/webp"});           check(1, "정상 Presigned PUT → 200", st == 200, st)
forged = url[:-1] + ("0" if url[-1] != "0" else "1")
st, _, _ = http("PUT", forged, data, {"Content-Type": "image/webp"});        check(2, "서명 위조 → 403", st == 403, st)
moved = url.replace(key, f"images/2026/10/{uuid.uuid4()}.webp")
st, _, _ = http("PUT", moved, data, {"Content-Type": "image/webp"});         check(3, "서명 후 경로 변경 → 403", st == 403, st)
st, _, _ = http("PUT", presign(f"images/2026/10/{uuid.uuid4()}.webp"), data, {"Content-Type": "image/png"})
check(4, "서명과 다른 Content-Type → 403", st == 403, st)
short = presign(f"images/2026/10/{uuid.uuid4()}.webp", expires=1); time.sleep(3)
st, _, _ = http("PUT", short, data, {"Content-Type": "image/webp"});         check(5, "만료된 주소 → 403 (5분 대신 1초로 시험)", st == 403, st)
st, _, _ = http("GET", f"{EP}/{BUCKET}?list-type=2");                        check(6, "익명 목록 조회 → 403", st == 403, st)
st, _, body = http("GET", f"{EP}/{BUCKET}/{key}");                           check(7, "익명 파일 하나 읽기 (images/*) → 200", st == 200 and body == data, st)
st, _, _ = http("PUT", f"{EP}/{BUCKET}/images/2026/10/{uuid.uuid4()}.webp", data, {"Content-Type": "image/webp"})
check(8, "서명 없는 익명 PUT → 403", st == 403, st)
s3.put_object(Bucket=BUCKET, Key="private/backup.txt", Body=b"x")
st, _, _ = http("GET", f"{EP}/{BUCKET}/private/backup.txt");                 check(9, "익명 읽기는 images/* 밖에서 403", st == 403, st)
pre = {"Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type"}
st, h, _ = http("OPTIONS", url, None, {**pre, "Origin": ORIGIN})
acao = {k.lower(): v for k, v in h.items()}.get("access-control-allow-origin")
check(10, f"CORS 사전 요청: 우리 출처({ORIGIN}) 허용", st in (200, 204) and acao in (ORIGIN, "*"), f"{st} {acao}")
st, h, _ = http("OPTIONS", url, None, {**pre, "Origin": "https://evil.example"})
acao = {k.lower(): v for k, v in h.items()}.get("access-control-allow-origin")
check(11, "CORS 사전 요청: 다른 출처 거부", acao not in ("https://evil.example", "*"), f"{st} {acao}")
print(f"결과: PASS {sum(results)} / FAIL {len(results) - sum(results)}")
sys.exit(0 if all(results) else 1)
