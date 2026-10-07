# 팀 블로그 플랫폼 Constitution

이 헌법은 세 팀원이 공통 회원·글·권한·데이터 규칙을 공유하고 각자 개인 서비스를 확장하는
velog형 블로그 플랫폼에 적용한다. 모든 Spec Kit 산출물(spec, plan, tasks, checklist)은
한국어로 작성한다. 근거 문서는 `docs/`이며, 특히 `docs/01-common-requirements.md`의
"공통 원칙"과 "결정 기록"을 우선한다. 문서끼리 다르면 가장 최근 날짜의 결정 기록을 따른다.

## Core Principles

### I. 공통 기준선 보존 (NON-NEGOTIABLE)

- 공통 ERD(통합 V1, `erd/V1__common_schema.sql`)는 바꾸지 않는다. 개인 확장은 테이블·컬럼을
  추가만 한다(MUST).
- 개인 확장을 더해도 `docs/01` Tier A·B의 공통 완료 기준(C-AUTH-1 등)을 그대로 만족해야 한다(MUST).
- DB 스키마 변경은 Flyway 마이그레이션으로만 한다(MUST).

근거: 세 사람이 같은 회원·글·권한 데이터를 공유해야 개인 서비스가 서로를 깨지 않는다.

### II. 서버가 권한을 결정한다

- 권한은 두 겹으로 검사한다. 화면에서 숨기고, 서버 Service 계층에서 다시 검사한다.
  화면에서 숨기는 것만으로 막지 않는다(MUST).
- 남의 비공개·임시·휴지통·숨긴 리소스는 403이 아니라 404로 응답하고, 없는 리소스와
  응답·링크 미리보기가 똑같아야 한다(MUST).
- 권한 판단의 기준표는 `docs/42-permission-matrix.md`다.

근거: 존재 여부가 드러나는 것 자체가 정보 유출이며, 화면 숨김은 우회할 수 있다.

### III. 본문 안전성 (NON-NEGOTIABLE)

- 본문은 Markdown 원문을 저장한다. 서버가 CommonMark+GFM으로 렌더링하고, 직접 쓴 HTML은
  글자로 처리한 뒤 OWASP 허용 목록으로 다시 정화한 HTML을 저장·출력한다(MUST).
- CSP·`nosniff`·Referrer-Policy 보안 헤더를 둔다(MUST).
- 사용자 입력이 스크립트로 실행되는 경로가 하나라도 생기는 변경은 받지 않는다.

근거: 블로그는 남이 쓴 글을 읽는 서비스라 XSS 한 건이 모든 독자에게 번진다
(`docs/12-content-sanitize.md`).

### IV. 모듈 경계와 부가 기능 격리

- 모듈러 모놀리스로 만든다. 하나의 저장소·하나의 배포 단위이며 MSA는 쓰지 않는다(MUST).
- 모듈은 다른 모듈의 Repository·테이블을 직접 쓰지 않고, 공개된 Service나 도메인 이벤트로만
  소통한다(MUST).
- 알림·AI·조회 집계 같은 부가 기능이 실패해도 글쓰기·읽기는 성공해야 한다(MUST).
  부가 기능은 커밋 이후 이벤트(`@TransactionalEventListener(AFTER_COMMIT)`)로 붙인다.

근거: 개인 확장 모듈이 공통 모듈을 수정하지 않고 붙을 수 있어야 한다
(`docs/02-architecture.md`, `docs/20-domain-events.md`).

### V. 실제 환경으로 검증하는 테스트

- 각 기능의 공통 완료 기준은 자동 테스트로 확인한다. 완료 기준 하나당 최소 하나의 테스트가
  있어야 한다(MUST).
- DB 테스트는 H2가 아니라 Testcontainers의 PostgreSQL로 한다. 보안 규칙은 Spring Security
  Test로 검증한다(MUST).
- 동시성 규칙(중복 가입, 좋아요 연타, 발행 연타 등)은 동시 요청 테스트로 확인한다(MUST).

근거: 문서의 완료 기준은 관찰 가능한 문장으로 쓰여 있어 그대로 테스트가 될 수 있고,
PostgreSQL 전용 기능(`pg_trgm`, 부분 UNIQUE, CHECK)은 H2에서 검증되지 않는다.

### VI. 정책 수치는 설정값으로

- 태그 최대 개수, 조회수 중복 기준, 페이지 크기처럼 팀원마다 다를 수 있는 수치는 코드가 아니라
  `application.yml` 설정값으로 둔다(MUST).

근거: 세 사람의 정책 차이를 코드 분기 없이 흡수한다.

## 기술 제약 (팀 합의)

- Java 21 + Spring Boot(Maven). 화면은 React + REST API이며 같은 도메인에서 서빙한다.
- 로그인은 Spring Session + Redis 세션 쿠키 + CSRF 토큰. JWT와 Thymeleaf SSR은 쓰지 않는다.
- PostgreSQL(`pg_trgm`), Redis(복제 + 자동 전환), MinIO(S3 API, Presigned URL), Flyway,
  Docker Compose.
- Markdown은 commonmark-java, 정화는 OWASP Java HTML Sanitizer. 버전은
  `docs/02-architecture.md`를 따른다.
- 이벤트는 앱 안에서 처리하고, 메시지 브로커는 공통에서 쓰지 않는다.
- 비밀값은 환경 변수로 주입하고 저장소에 커밋하지 않는다.

## 개발 흐름

- 기능 하나 = spec 하나. 범위는 `docs/01`의 기능 ID(C-AUTH-1 등) 단위로 자른다.
  MVP 순서는 `001-auth-ownership` → `002-write-publish` → `003-read-share`다.
- spec에는 해당 `docs` 문서의 "공통 완료 기준" 표를 수용 기준으로 옮긴다.
- plan은 `docs/02-architecture.md`의 package-by-feature 구조(web / application / domain / infra)를
  따른다.
- 공통 영역(공통 Service·ERD)을 바꾸는 변경은 다른 두 팀원에게 알리고 합의한 뒤 병합한다.

## Governance

- 이 헌법은 다른 관행보다 우선한다.
- 개정은 팀 합의 후 의미적 버전을 올린다. 원칙 삭제·재정의는 MAJOR, 원칙·절 추가나 실질적
  확장은 MINOR, 문구 정리는 PATCH다. 개정 이유는 PR 설명에 남긴다.
- 모든 PR 리뷰에서 위 원칙 준수 여부를 확인한다. 원칙을 어기는 복잡성은 plan의
  Complexity Tracking에 이유를 적어야 한다.
- 실행 중 참고할 상세 규칙은 `docs/` 문서를 따른다.

**Version**: 1.0.0 | **Ratified**: 2026-10-07 | **Last Amended**: 2026-10-07
