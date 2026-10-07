# 구현 메모: 034 요청 쪽 오류를 서버 오류로 보지 않기 (v1.16.7)

| 파일 | 바뀜 |
|---|---|
| `shared/error/GlobalExceptionHandler` | 마지막 `Exception` 처리기에서 스프링 `ErrorResponse`의 4xx와 끊긴 연결을 먼저 걸러 낸다 |
| `GlobalExceptionHandlerTest` (새로) | 406 본문 없음, 413·418·499 상태 유지, 503은 500, 끊긴 연결, 그 밖 6개 |
| `ErrorMappingTest` (새로) | `Accept: application/xml`로 `/api/posts` → 406, ERROR 로그 없음 (고치기 전 실패 확인) |
| `JobLockTest` (새로) | 잡고 풀기, 다른 서버가 잡음, Redis 무응답·장애, 작업 실패에도 풀기, 풀기 실패 6개 |

## 결정
- 이미 따로 다루는 예외(404·405·400 등)의 문구는 그대로 둔다. 새 분기는 따로 처리기가 없는 스프링 예외에만 닿는다.
- `ErrorResponse`는 예외 클래스가 아닌 인터페이스라 `@ExceptionHandler`에 걸 수 없어, 마지막 처리기 안에서 `instanceof`로 고른다.
- 버그 수정이라 Patch 버전이다.
