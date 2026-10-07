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
| PostgreSQL | Crowfoot 발급 DB (`nhnacademy` DB, 스키마 `cf_u25_d1`) | 호스트·비밀번호는 Crowfoot 데이터베이스 탭. 안 되면 학교 PG-SQL `s3.java21.net:8000`의 2팀 DB(계정은 secret.env에만). 테이블은 앱 시작 때 Flyway가 만든다 |
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

## CI (`.github/workflows/deploy.yml`)

| 단계 | 언제 | 하는 일 |
|---|---|---|
| 매니페스트 검증 | PR·main 푸시 | 비밀값 검사, `kustomize build` + `kubeconform` (local·nhn) |
| 이미지 빌드 | `app/backend`가 있을 때 | PR은 빌드만, main은 `ghcr.io/<owner>/blog-app:<커밋>`으로 올림 |
| NHN 배포 | Actions에서 수동 실행(`deploy` 체크) | 저장소 Secret `KUBECONFIG`와 `BLOG_SECRET_ENV`(secret.env 내용 전체)로 배포 |

배포 단계는 GitHub Environment `nhn`을 쓰므로 승인자 보호 규칙을 걸 수 있다.

## 로컬에서 검증

kind·k3s·Docker Desktop 어느 것이든 된다.

```bash
kubectl apply -k deploy/k8s/overlays/local
kubectl -n blog get pods
kubectl -n blog port-forward svc/blog-app 8080:80
```

2026-10-07 검증 결과 (k3s v1.33.4, 클라우드 세션):
- `kustomize build` + `kubeconform -strict`: local 17개, nhn 10개 리소스 모두 통과
- local 배포: PostgreSQL 17·Redis 7.4·MinIO(pgsty/silo)·앱 자리 이미지 모두 Running, 앱 파드에서 세 서비스 접속과 환경 변수 주입 확인
- `V1__schema_docs51.sql`을 클러스터 안 PostgreSQL 17에 적용해 테이블 20개 생성 확인
- 앱 이미지가 아직 없어 앱 자리에는 상태 확인만 답하는 작은 대역 이미지를 썼다. 실제 앱 이미지로는 아직 돌려 보지 않았다.

## 클라우드 세션에서 학교 서버 접속 확인 결과 (2026-10-07)

이 클라우드 환경의 네트워크 정책 때문에 학교 서버에 닿지 않았다. 학교 서버 문제가 아니다.

| 대상 | 결과 |
|---|---|
| `storage.java21.net` (80) | 프록시 403 `host_not_allowed` (허용 목록에 없음) |
| `ollama.java21.net`, `owui.java21.net` (443) | 프록시 403 |
| `s3.java21.net:8000` (PostgreSQL), `220.67.216.14:6379` (Redis), `s4.java21.net` 5672·15672·9000·9200·5601, `s4.java21.net:13306` | TCP 연결 시간 초과 |

클라우드 환경의 Network access를 Full로 바꾸면 다시 확인한다. 민서님 Mac과 학교 클러스터에서는 외부 주소로 바로 접속된다.
