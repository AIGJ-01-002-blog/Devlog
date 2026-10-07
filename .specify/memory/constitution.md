# 팀 블로그 Constitution

<!--
Sync Impact Report
- Version: (template) → 1.0.0
- 원칙 7개 신설 (I~VII), 기술 제약·개발 흐름·Governance 섹션 신설
- 근거: docs/01-common-requirements.md §3·결정 기록, docs/02-architecture.md, docs/42-permission-matrix.md
- 템플릿 영향: plan-template의 Constitution Check는 이 원칙 I~VII로 점검 ✅ / spec·tasks 템플릿 변경 없음 ✅
- TODO: RATIFICATION_DATE (팀 합의일)
-->

## Core Principles

### I. 공통 ERD는 추가만 한다 (NON-NEGOTIABLE)

- 공통 ERD([docs/51-erd-unified.md](../../docs/51-erd-unified.md), Flyway V1)의 테이블·컬럼·제약은 바꾸거나 지우지 않는다. 개인 확장은 **새 테이블·nullable 컬럼 추가**로만 한다.
- DB 스키마는 Flyway 마이그레이션으로만 바꾼다. 수동 DDL 금지.
- 정하지 않은 FK는 `ON DELETE RESTRICT`. 애플리케이션은 23001·23503을 모두 FK 위반으로 처리한다.
- 개인 확장을 더해도 공통 완료 기준(C-*)은 그대로 통과해야 한다.

**Why:** 세 사람이 같은 뼈대 위에 서로 다른 서비스를 올리므로, 공통 부분이 흔들리면 모두가 깨진다.

### II. 모듈 경계를 지킨다

- 모듈러 모놀리스, 하나의 저장소·하나의 배포 단위. MSA 금지.
- 패키지는 기능 우선(`account`, `post`, `tag`, `media`, `interaction`, `discovery`, `shared`), 모듈 안에서 `web / application / domain / infra`.
- 모듈은 다른 모듈의 Repository·테이블을 직접 쓰지 않고 **공개 Service 또는 도메인 이벤트**로만 소통한다.
- 권한·상태 전이·검증은 Service(또는 도메인 메서드)에 둔다. Controller에 업무 규칙을 두지 않는다.

### III. 권한은 서버가 판정하고, 볼 수 없으면 404 (NON-NEGOTIABLE)

- 현재 사용자는 인증 정보에서만 꺼낸다. 작성자 ID를 요청 파라미터로 받지 않는다.
- 소유 검사는 `author_id = currentUserId` 조건 조회로 하고, 없으면 404.
- 남의 비공개·임시·삭제·숨김 리소스는 403이 아니라 **404**. 없는 글과 볼 수 없는 글의 응답·링크 미리보기는 똑같다.
- 화면에서 숨기는 것은 보조 수단일 뿐이다.
- 글 읽기 판정은 `PostAccessPolicy.canRead` 하나, 목록은 같은 규칙의 `VisibilityFilter`만 쓴다.

### IV. 사용자 입력은 안전하게 렌더링한다 (NON-NEGOTIABLE)

- 본문은 Markdown 원문을 저장하고, HTML은 서버가 CommonMark+GFM으로 렌더링 → 직접 쓴 HTML은 글자로 → OWASP 허용 목록 정화 → 저장한다. HTML을 만드는 곳은 렌더러 하나뿐이다.
- 제목·소개·댓글은 글자만(이스케이프).
- CSP·`nosniff`·`Referrer-Policy`를 항상 켠다. XSS 테스트 목록(`docs/12-content-sanitize.md`)은 회귀 테스트로 유지한다.

### V. 부가 기능은 핵심을 막지 않는다

- 조회수·알림·AI·검색 색인·통계가 실패해도 글쓰기·읽기는 성공한다.
- 후속 처리는 도메인 이벤트 + `@TransactionalEventListener(AFTER_COMMIT)`로 붙인다. 새 기능을 붙일 때 기존 모듈 수정을 최소화한다.
- 트랜잭션 안에서 외부 호출(LLM·파일 저장·HTTP·Redis 삭제)을 하지 않는다.
- Redis 장애 시 정책은 `docs/02-architecture.md` §2 표를 따른다.

### VI. 실제 환경으로 테스트한다

- 권한·상태 전이·동시성이 걸린 기능은 **통합 테스트 필수**. DB는 H2가 아니라 Testcontainers PostgreSQL.
- 각 spec의 완료 기준은 자동 테스트 하나 이상과 1:1로 대응한다.
- CI 커버리지 최소 40%. PR은 CI 통과 후에만 병합한다.

### VII. 정책 차이는 설정값으로

- 태그 최대 개수, 조회수 중복 기준, 페이지 크기 등 팀원마다 다른 수치는 `application.yml` 설정값으로 둔다. 코드에 상수로 박지 않는다.

## 기술 제약

| 영역 | 공통 |
|---|---|
| 서버 | Java 21, Spring Boot (버전 팀 확정), Spring Data JPA, Maven |
| 화면 | React, 서버는 REST API. React 빌드는 API와 같은 도메인에서 서빙 |
| 인증 | 이메일 + Google + GitHub. 세션 쿠키(Spring Session + Redis, HttpOnly) + CSRF 토큰 |
| 저장소 | PostgreSQL(`pg_trgm`), Redis, MinIO(Presigned URL, SigV4) |
| API 규약 | `/api/...` 복수형, 내 리소스 `/api/me/...`. 오류 본문 `{ code, message, errors[], details }`, 검증 오류 400. 커서는 불투명 Base64URL, 잘못된 커서 400 `INVALID_CURSOR`. 명세는 springdoc OpenAPI |
| 비기능 | 목록·상세 서버 응답 300ms 이내(글 1만 건), N+1 금지, 375px~데스크톱 가로 스크롤 없음 |
| 비밀값 | 환경 변수로만 주입. 저장소에 커밋 금지 |

## 개발 흐름

1. 기능은 Spec Kit 순서로: specify → clarify → plan → tasks → analyze → implement → converge.
2. spec.md에는 무엇·왜·완료 기준만 쓰고, 상세 결정은 `docs/` 문서를 링크한다. 둘이 어긋나면 `docs/`의 결정 기록이 우선이고, spec.md를 고친다.
3. plan 단계에서 이 constitution의 각 원칙을 점검하고, 어기는 설계는 plan의 Complexity Tracking에 이유를 적는다.
4. 결정이 새로 생기면 `docs/01-common-requirements.md` 결정 기록에 날짜와 함께 남긴다.

## Governance

- 이 constitution은 공통 템플릿 저장소에 있고, 세 사람 모두에게 적용된다. 개인 저장소에서 원칙을 **더 엄격하게** 하는 것은 자유지만 완화하려면 팀 합의가 필요하다.
- 개정: 팀 회의 합의 → 템플릿 저장소 PR → 각자 저장소로 가져간다. 버전은 원칙 삭제·완화는 MAJOR, 원칙 추가는 MINOR, 문구 정리는 PATCH.
- 모든 PR 리뷰는 원칙 I·III·IV 위반 여부를 확인한다.

**Version**: 1.0.0 | **Ratified**: TODO(팀 합의일) | **Last Amended**: 2026-10-07
