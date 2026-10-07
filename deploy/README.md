# 블로그 쿠버네티스 배포

앱(Spring Boot, `app/backend`)을 쿠버네티스에 올린다. 데이터 서비스는 두 가지 중 고른다.

- `overlays/selfhosted` (기본): PostgreSQL·Redis·MinIO를 같은 클러스터 안에 영구 볼륨과 함께 띄운다. 학교 서버가 외부망에서 닫혀 있어(2026-10-07 실측) 지금은 이 구성이 운영 기준이다.
- `overlays/nhn`: 학교 NHN 공용 서버를 쓴다. 학교망(또는 VPN)에서 닿는 클러스터가 생기면 그대로 쓴다.

비밀번호 같은 접속 정보는 이 저장소에 **절대 넣지 않는다.** 쿠버네티스 Secret(로컬 `secret.env` 또는 GitHub Secret)으로만 넣는다.

## 구성

```
deploy/
├── docker/Dockerfile            앱 이미지 (Java 21, 루트 아닌 사용자, 계층 분리)
├── k8s/base/                    환경 공통: Deployment·Service·Ingress·HPA·PDB·NetworkPolicy
├── k8s/components/in-cluster-deps/  PostgreSQL 17·Redis 7.4·MinIO StatefulSet + 사진 버킷 자동 생성 + 접근 제한
├── k8s/overlays/selfhosted/     운영 기본: base + in-cluster-deps (도메인은 app.env·kustomization.yaml)
├── k8s/overlays/nhn/            학교 공용 인프라 사용 (학교망에서만)
│   ├── app.env                  비밀 아닌 설정 (주소, Redis DB 번호 등)
│   └── secret.env.example       비밀값 형식. secret.env로 복사해 채운다 (커밋 금지)
├── k8s/overlays/local/          로컬 검증용: selfhosted와 같은 부품, 개발 로그인 켬
├── scripts/gen-secret-env.sh    secret.env를 임의 비밀번호로 만들어 줌
├── scripts/rollout.sh           배포 + 헬스 체크 실패 시 자동 롤백
└── scripts/check-no-secrets.sh  비밀값이 커밋됐는지 검사 (CI에서도 실행)
```

환경 변수 이름은 앱과 맞춘 목록(`/mnt/project-files/infra/app-env-vars.md`)을 따른다.

학교 인프라(nhn overlay)를 쓸 때의 주소:

| 무엇 | 어디서 | 비고 |
|---|---|---|
| PostgreSQL | Crowfoot 발급 DB (`nhnacademy` DB, `DB_SCHEMA=cf_u25_d1`) | 호스트·비밀번호는 Crowfoot 데이터베이스 탭. 안 되면 학교 PG-SQL `s3.java21.net:8000`의 2팀 DB(계정은 secret.env에만). 테이블은 앱 시작 때 Flyway가 만든다 |
| Redis | `220.67.216.14:6379` | DB 번호 8 (318·319는 범위 0~56 밖이라 마지막 대안 8). `FLUSHALL` 금지 |
| MinIO | `storage.java21.net` | 버킷 `blog-images` |
| RabbitMQ | `s4.java21.net:5672` | 알림(015) |
| Elasticsearch | `s4.java21.net:9200` | 검색(014), nori 플러그인 |
| Ollama | `ollama.java21.net` | AI 태그 추천(018) |

앱 쪽 전제: 포트 8080, Spring Boot Actuator의 `/actuator/health/liveness`·`/actuator/health/readiness`(쿠버네티스 안에서 자동으로 열림), 세션은 Redis라 파드를 여러 개 띄워도 된다.

selfhosted에서는 RabbitMQ·Elasticsearch·Ollama를 띄우지 않는다. 아직 앱(0.7.0)이 쓰지 않고, 알림(015)·검색(014)·AI 태그(018)를 구현할 때 같은 부품에 더한다.

## 클러스터에 배포 (수동)

2026-10-07 기준 학교에서 받은 쿠버네티스 클러스터는 없다. 클러스터가 생기면 아래처럼 올린다.

selfhosted (기본):

```bash
deploy/scripts/gen-secret-env.sh selfhosted   # DB·Redis·MinIO 비밀번호를 임의 값으로 채운 secret.env (커밋 금지)
# secret.env의 GITHUB_CLIENT_ID/SECRET(필수), SMTP_*(이메일 가입을 열 때)를 채운다
# app.env의 SITE_BASE_URL·IMAGE_PUBLIC_BASE_URL과 kustomization.yaml의 ingress host를 실제 도메인으로 바꾼다
kubectl apply -k deploy/k8s/overlays/selfhosted
kubectl -n blog rollout status deploy/blog-app
```

- 앱 파드가 뜨기 전에 `ensure-bucket` init 컨테이너가 MinIO에 `blog-images` 버킷을 만들고 읽기 공개로 둔다. 사진은 같은 도메인의 `/blog-images/...`로 인그레스가 MinIO에 넘긴다(혼합 콘텐츠 없음).
- PostgreSQL·Redis는 앱 파드에서만, MinIO는 앱과 ingress-nginx 네임스페이스에서만 접속된다(NetworkPolicy).
- 데이터는 PVC(PostgreSQL 5Gi, MinIO 10Gi, Redis 1Gi)에 남는다. 네임스페이스를 지우면 PVC도 지워지니 백업 후에 지운다.
- 비밀번호를 바꾸려면 DB·MinIO 안의 계정도 같이 바꿔야 한다. 처음 만든 값을 그대로 쓰는 것이 안전하다.

nhn (학교망에서 닿을 때):

```bash
cd deploy/k8s/overlays/nhn
cp secret.env.example secret.env      # 실제 값 채우기 (커밋 금지, .gitignore에 있음)
# app.env의 DB_URL 호스트·포트를 Crowfoot 데이터베이스 탭 값으로 바꾼다
kubectl apply -k .
kubectl -n blog rollout status deploy/blog-app
```

## CI/CD

민서님 이전 프로젝트 CI/CD 템플릿(PR 검사 → 이미지 → 배포 → 헬스 체크·자동 롤백 → Discord 알림)을 쿠버네티스 방식으로 옮겼다.

| 워크플로 | 언제 | 하는 일 |
|---|---|---|
| `backend-ci.yml` | PR·main (백엔드 변경) | `./mvnw verify`: 테스트 + JaCoCo 줄 커버리지 40% 기준, 보고서 업로드, (선택) SonarQube |
| `frontend-ci.yml` | PR·main (화면 변경) | 타입 검사, 테스트, 빌드 |
| `deploy.yml` | PR·main·수동 | 매니페스트 검증(local·nhn·selfhosted) + 비밀값 검사 → 이미지 빌드(main은 GHCR에 올림) → 수동 실행 시 고른 overlay로 배포 |
| `pr-review-notify.yml` | PR이 리뷰 가능해질 때 | Discord 리뷰 요청 알림 |
| `release.yml` | CHANGELOG 버전이 main에 들어올 때 | 태그와 GitHub Release |

배포는 `deploy/scripts/rollout.sh`가 한다. 새 이미지로 바꾼 뒤 모든 파드가 준비(`/actuator/health/readiness` UP)되기를 기다리고, 시간(`ROLLOUT_TIMEOUT_SECONDS`, 기본 300초) 안에 안 되면 `kubectl rollout undo`로 직전 버전으로 되돌린다. 새 파드가 준비되기 전에는 옛 파드를 내리지 않으므로(`maxUnavailable: 0`) 되돌리는 동안에도 서비스는 끊기지 않는다. Actions → 블로그 배포 → Run workflow에서 `rollback_test`를 켜면 없는 이미지로 배포해 롤백을 시험한다.

### 저장소 설정 (Settings → Secrets and variables → Actions)

| 종류 | 이름 | 값 | 없으면 |
|---|---|---|---|
| Secret | `KUBECONFIG` | 클러스터 접속 파일 내용 | 배포 실패 |
| Secret | `BLOG_SECRET_ENV` | 고른 overlay의 `secret.env` 내용 전체 (Environment Secret으로 overlay마다 따로 둘 수 있음) | 배포 실패 |
| Secret | `DISCORD_WEBHOOK_URL`, `DISCORD_PR_WEBHOOK_URL` | Discord 웹훅 주소 | 알림만 안 감 |
| Secret | `SONAR_TOKEN`, `SONAR_HOST_URL` | 학교 SonarQube(`http://s4.java21.net:9000`) 토큰·주소 | 품질 검사 건너뜀 |
| Variable | `DISCORD_ENABLED` | `true`면 알림 켬 | 꺼짐 |
| Variable | `SONAR_ENABLED` | `true`면 SonarQube 켬 | 꺼짐 |
| Variable | `SERVICE_NAME` | 알림에 보일 이름 | 레포 이름 |
| Variable | `ROLLOUT_TIMEOUT_SECONDS` | 배포 대기 초 | 300 |

Run workflow의 `overlay`(기본 selfhosted)가 배포 대상과 GitHub Environment 이름(`selfhosted`·`nhn`)을 정하므로 Settings → Environments에서 승인자를 걸 수 있다. AI 리뷰는 [CodeRabbit 앱](https://github.com/apps/coderabbitai)을 설치하면 `.coderabbit.yaml`(한국어, 경로별 리뷰 기준)을 읽는다.

## 로컬에서 검증

kind·k3s·Docker Desktop 어느 것이든 된다.

```bash
kubectl apply -k deploy/k8s/overlays/local
kubectl -n blog get pods
kubectl -n blog port-forward svc/blog-app 8080:80
```

2026-10-07 검증 결과 (k3s v1.33.4, 클라우드 세션):
- `rollout.sh`: v0.2.0 정상 배포, 롤백 시험(없는 이미지) 때 60초 뒤 직전 버전으로 되돌아가고 그동안 옛 파드가 계속 응답
- `kustomize build` + `kubeconform -strict`: local 17개, nhn 10개 리소스 모두 통과
- local 배포: PostgreSQL 17·Redis 7.4·MinIO(pgsty/silo)·앱 자리 이미지 모두 Running, 앱 파드에서 세 서비스 접속과 환경 변수 주입 확인
- `V1__schema_docs51.sql`을 클러스터 안 PostgreSQL 17에 적용해 테이블 20개 생성 확인
- 실제 앱(구현 PR #3, 커밋 027e062)을 이 Dockerfile의 런타임 단계 그대로 이미지로 만들어 배포: 재시작 없이 Running, Flyway V1·V2 적용(테이블 20개 + 이력), `/actuator/health/readiness` UP, 비로그인 `/api/me` 401 + CSRF 쿠키 확인
- 앱보다 PostgreSQL이 늦게 뜨면 앱 파드가 몇 번 재시작한 뒤 붙는다(정상 동작)

selfhosted 검증 (2026-10-07, k3s v1.33.4, 앱 v0.7.0 = main f6311ed를 이 Dockerfile 단계 그대로 빌드):
- `rollout.sh`(OVERLAY=selfhosted)로 빈 네임스페이스에 처음 배포: PostgreSQL·Redis·MinIO StatefulSet과 PVC 3개, 앱 2개 파드가 재시작 없이 준비
- `ensure-bucket`이 `blog-images` 버킷 생성·읽기 공개, Flyway가 테이블 생성(`\dt` 29행), `/actuator/health/readiness` UP
- 가입 → 글 쓰기 → 발행 → 비로그인 글 읽기 → 프로필 사진(256×256 PNG) 올리기 → MinIO에서 비로그인으로 그 사진 받기(200 image/png) 모두 성공. 시험 때만 ConfigMap에서 개발 로그인을 잠깐 켰다가 원래대로 돌림
- 세션이 Redis(`blog:session:*`)에 저장되고, PostgreSQL·Redis·MinIO 파드를 지웠다 다시 띄워도 발행한 글이 남음
- 앱이 아닌 파드에서 Redis·MinIO 접속이 거절됨(NetworkPolicy), 앱은 정상
- 인그레스 `/blog-images` 경로는 이 클러스터에 ingress-nginx가 없어 매니페스트 검사만 함

## 클라우드 세션에서 학교 서버 접속 확인 결과 (2026-10-07)

이 클라우드 환경의 네트워크 정책 때문에 학교 서버에 닿지 않았다. 학교 서버 문제가 아니다.

| 대상 | 결과 |
|---|---|
| `storage.java21.net` (80) | 프록시 403 `host_not_allowed` (허용 목록에 없음) |
| `ollama.java21.net`, `owui.java21.net` (443) | 프록시 403 |
| `s3.java21.net:8000` (PostgreSQL), `220.67.216.14:6379` (Redis), `s4.java21.net` 5672·15672·9000·9200·5601, `s4.java21.net:13306` | TCP 연결 시간 초과 |

2026-10-07 민서님이 집 인터넷(외부망)의 Mac에서 다시 확인한 결과, 학교 쪽 방화벽도 외부 접속을 막고 있다.

| 대상 | 외부망 결과 |
|---|---|
| `storage.java21.net` http 80 | 열림 (200). https 443은 거절 → MinIO 주소는 `http://storage.java21.net` |
| `s3.java21.net:8000` (PostgreSQL), `220.67.216.14:6379` (Redis) | 닫힘 |
| `s4.java21.net` 5672·15672 (RabbitMQ), 9200 (ES, No route to host), 5601, 9000, 13306 | 닫힘 |
| `ollama.java21.net:443` | 닫힘 |

PostgreSQL·Redis·RabbitMQ·Elasticsearch·Ollama는 학교 내부망이나 VPN에서만 열려 있는 것으로 보인다(추정). 그래서 클라우드 환경 Network access를 Full로 바꿔도 MinIO 말고는 닿지 않을 수 있다. `overlays/nhn`은 학교 내부망 안의 클러스터나 VPN이 연결된 환경에서만 그대로 동작한다.
