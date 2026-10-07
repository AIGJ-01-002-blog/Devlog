# Feature Specification: 요청 쪽 오류를 서버 오류로 보지 않기

**Feature Branch**: `034-framework-error-status`
**Created**: 2026-10-08
**Status**: Implemented (v1.16.7)
**근거**: 민서 요청 "모든 기능을 최적화 해서 구현해줘"(2026-10-07)에 따른 테스트 보강. 커버리지가 낮던 `GlobalExceptionHandler`(31%)와 `JobLock`(28%)을 보강하며 결함 하나를 찾았다.

## 찾은 결함
`Accept: application/xml`처럼 JSON을 받지 않겠다는 요청(크롤러·피드 리더 등)이 API에 오면, 스프링이 406으로 정해 둔 오류를 "처리하지 못한 오류"로 잡아 ERROR 로그와 스택 전체를 남겼다. 응답은 결국 406이었지만 운영 로그에는 서버 고장처럼 쌓였다. 연결이 이미 끊긴 요청(`AsyncRequestNotUsableException`)도 같은 길로 ERROR가 됐다.

## Requirements
- **FR-001**: 스프링이 4xx 상태를 정해 둔 오류는 그 상태로 돌려주고 ERROR 로그를 남기지 않는다. 본문 코드는 상태 이름(`CONTENT_TOO_LARGE` 등), 모르는 상태면 `BAD_REQUEST`다.
- **FR-002**: 406은 요청이 받겠다는 형식으로 본문을 쓸 수 없으므로 상태만 보낸다.
- **FR-003**: 받을 쪽이 끊긴 요청은 아무것도 쓰지 않는다.
- **FR-004**: 스프링이 5xx로 정한 오류와 그 밖의 예외는 지금처럼 ERROR 로그와 `INTERNAL_ERROR` 500이다.
