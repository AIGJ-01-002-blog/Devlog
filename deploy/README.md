# 블로그 쿠버네티스 배포

앱(Spring Boot, `app/backend`) 하나를 쿠버네티스에 올리고, 데이터는 학교 NHN 공용 인프라를 쓴다.
비밀번호 같은 접속 정보는 이 저장소에 **절대 넣지 않는다.** 쿠버네티스 Secret(로컬 `secret.env` 또는 GitHub Secret)으로만 넣는다.

## 구성

```
deploy/
├── docker/Dockerfile            앱 이미지 (Java 21, 루트 아닌 사용자, 계층 분리)
├── k8s/base/                    환경 공통: Deployment·Service·Ingress·HPA·PDB·NetworkPolicy
├── k8s/overlays/nhn/            학교 공용 인프라 사용 (운영)
│   ├── app.env                  비밀 아닌 설정 (주소, Redis DB 번호 등)
│   └── secret.env.example       비밀값 형식. secret.env로 복사해 채운다 (커밋 금지)
├── k8s/overlays/local/          로컬 검증용: PostgreSQL·Redis·MinIO를 클러스터 안에 함께 띄움
└── scripts/check-no-secrets.sh  비밀값이 커밋됐는지 검사 (CI에서도 실행)
```

환경 변수 이름은 앱과 맞춘 목록(`/mnt/project-files/infra/app-env-vars.md`)을 따른다.

| 무엇 | 어디서 | 비고 |
|---|---|---|
| PostgreSQL | Crowfoot 발급 DB (`nhnacademy` DB, `DB_SCHEMA=cf_u25_d1`) | 호스트·비밀번호는 Crowfoot 데이터베이스 탭. 안 되면 학교 PG-SQL `s3.java21.net:8000`의 2팀 DB(계정은 secret.env에만). 테이블은 앱 시작 때 Flyway가 만든다 |
| Redis | `220.67.216.14:6379` | DB 번호 8 (318·319는 범위 0~56 밖이라 마지막 대안 8). `FLUSHALL` 금지 |
| MinIO | `storage.java21.net` | 버킷 `blog-images` |
| RabbitMQ | `s4.java21.net:5672` | 알림(015) |
| Elasticsearch | `s4.java21.net:9200` | 검색(014), nori 플러그인 |
| Ollama | `ollama.java21.net` | AI 태그 추천(018) |

앱 쪽 전제: 포트 8080, Spring Boot Actuator의 `/actuator/health/liveness`·`/actuator/health/readiness`(쿠버네티스 안에서 자동으로 열림), 세션은 Redis라 파드를 여러 개 띄워도 된다.

## 클러스터에 배포 (수동)

2026-10-07 기준 학교에서 받은 쿠버네티스 클러스터는 없다. 클러스터가 생기면 아래처럼 올린다.

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
| `deploy.yml` | PR·main·수동 | 매니페스트 검증 + 비밀값 검사 → 이미지 빌드(main은 GHCR에 올림) → 수동 실행 시 배포 |
| `pr-review-notify.yml` | PR이 리뷰 가능해질 때 | Discord 리뷰 요청 알림 |
| `release.yml` | CHANGELOG 버전이 main에 들어올 때 | 태그와 GitHub Release |

배포는 `deploy/scripts/rollout.sh`가 한다. 새 이미지로 바꾼 뒤 모든 파드가 준비(`/actuator/health/readiness` UP)되기를 기다리고, 시간(`ROLLOUT_TIMEOUT_SECONDS`, 기본 300초) 안에 안 되면 `kubectl rollout undo`로 직전 버전으로 되돌린다. 새 파드가 준비되기 전에는 옛 파드를 내리지 않으므로(`maxUnavailable: 0`) 되돌리는 동안에도 서비스는 끊기지 않는다. Actions → 블로그 배포 → Run workflow에서 `rollback_test`를 켜면 없는 이미지로 배포해 롤백을 시험한다.

### 저장소 설정 (Settings → Secrets and variables → Actions)

| 종류 | 이름 | 값 | 없으면 |
|---|---|---|---|
| Secret | `KUBECONFIG` | 클러스터 접속 파일 내용 | 배포 실패 |
| Secret | `BLOG_SECRET_ENV` | `secret.env` 내용 전체 | 배포 실패 |
| Secret | `DISCORD_WEBHOOK_URL`, `DISCORD_PR_WEBHOOK_URL` | Discord 웹훅 주소 | 알림만 안 감 |
| Secret | `SONAR_TOKEN`, `SONAR_HOST_URL` | 학교 SonarQube(`http://s4.java21.net:9000`) 토큰·주소 | 품질 검사 건너뜀 |
| Variable | `DISCORD_ENABLED` | `true`면 알림 켬 | 꺼짐 |
| Variable | `SONAR_ENABLED` | `true`면 SonarQube 켬 | 꺼짐 |
| Variable | `SERVICE_NAME` | 알림에 보일 이름 | 레포 이름 |
| Variable | `ROLLOUT_TIMEOUT_SECONDS` | 배포 대기 초 | 300 |

배포 잡은 GitHub Environment `nhn`을 쓰므로 Settings → Environments에서 승인자를 걸 수 있다. AI 리뷰는 [CodeRabbit 앱](https://github.com/apps/coderabbitai)을 설치하면 `.coderabbit.yaml`(한국어, 경로별 리뷰 기준)을 읽는다.

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
