# 구현 메모: 034 요청 쪽 오류를 서버 오류로 보지 않기 (v1.16.7)

| 파일 | 바뀜 |
|---|---|
| `shared/error/GlobalExceptionHandler` | 마지막 `Exception` 처리기에서 스프링 `ErrorResponse`의 4xx와 끊긴 연결을 먼저 걸러 낸다 |
| `GlobalExceptionHandlerTest` (새로) | 406 본문 없음, 413·418·499 상태 유지, 503은 500, 끊긴 연결, 그 밖 6개 |
| `ErrorMappingTest` (새로) | `Accept: application/xml`로 `/api/posts` → 406, ERROR 로그 없음 (고치기 전 실패 확인) |
| `IntegrationTest.uniqueLogin` | 이름과 번호 사이에 `x`. 금칙어 검사가 숫자를 글자로도 읽어 `trash17`이 `trashit`(shit)이 되어 가입이 400으로 깨졌다(CI에서 실행 순서에 따라 발생) |
| `ReadShareTest` 실행 계획 검사 | 설정과 EXPLAIN을 한 연결에서, 전체 읽기·따로 정렬을 막아 정렬까지 맞춘 부분 인덱스만 남게 했다. 전에는 데이터가 적으면 `ix_post_manage`+정렬을 골랐다 |
| `JobLockTest` (새로) | 잡고 풀기, 다른 서버가 잡음, Redis 무응답·장애, 작업 실패에도 풀기, 풀기 실패 6개 |

## 결정
- 이미 따로 다루는 예외(404·405·400 등)의 문구는 그대로 둔다. 새 분기는 따로 처리기가 없는 스프링 예외에만 닿는다.
- `ErrorResponse`는 예외 클래스가 아닌 인터페이스라 `@ExceptionHandler`에 걸 수 없어, 마지막 처리기 안에서 `instanceof`로 고른다.
- 버그 수정이라 Patch 버전이다.
