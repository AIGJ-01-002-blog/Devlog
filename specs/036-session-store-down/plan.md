# 구현 메모: 036 세션 저장소가 멈췄을 때 가입·로그인 응답 (v1.16.9)

| 파일 | 바뀜 |
|---|---|
| `shared/security/ResilientSessionFilter` | `SessionUnavailableException`이 `ApiException`(503 `TEMPORARILY_UNAVAILABLE`)을 상속한다. 원인 예외는 `cause`로 남긴다 |
| `ResilientSessionFilterTest` (새로) 7개 | 비로그인 처리와 저장소 재조회 없음, 유효성 검사 실패, 세션 생성 거부(503·원인 보존), 다른 예외는 그대로, 정상 저장소, 원인 사슬 판별, 컨트롤러에서 세션을 만들 때 503 JSON |

## 결정
- 전용 처리기를 공통 오류 처리기에 더하지 않고 `ApiException`을 상속했다. 상태·코드·문구가 예외 한 곳에 모이고, 처리기는 이미 `ApiException`을 공통 형식으로 돌려준다.
- 코드와 문구는 `LoginGuardFilter`·`AuthTokens`의 저장소 장애 응답과 같게 맞췄다.
- 장애 처리 고침이라 Patch 버전이다.
