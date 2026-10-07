# 구현 메모: 013 조회수 (v1.2.0)

## 구조
| 파일 | 역할 |
|---|---|
| `view/web/ViewController` | `POST /api/posts/{id}/views` → 항상 204 `no-store`(볼 수 없는 글만 404). 미리 불러오기 헤더 판정, 첫 방문 비회원에게 `vid` 쿠키 |
| `view/application/ViewRecorder` | 제외 판정 한곳, 방문자 키(해시), 요청 제한, Redis 스크립트로 중복 판정 + 모으기 |
| `view/application/ViewFlushJob` | 1분마다 `view:pending` → `view:processing` → 글마다 `post_view` 행 넣고 지우기 (JobLock "view-flush") |
| `shared/config/BlogProperties.View` | `window`(24h), `maxPerWindow`(1), `perMinute`(60), `botPattern` |
| 화면 `lib/views.ts` | `watchView`(IntersectionObserver + visibilitychange, 1초), `useViewBeacon`, 안내 문구 |

## 결정
- 조회수는 저장하지 않고 `post_view` 행을 센다(V3 정규화, `post_stat`). 일별 합계 테이블 없이 같은 행으로 기간 통계를 낸다.
- Redis 키
  - `view:seen:{글}:{방문자 해시}`: 처음 본 순간부터 `window` 동안 남는 횟수. INCR + 첫 회 PEXPIRE
  - `view:pending`(해시, 글 → 모인 수), 반영 중에는 `view:processing`
  - `view:salt:{KST 날짜}`: 쿠키 없는 비회원 해시용 그날 비밀값(25시간)
- 비회원 첫 요청은 쿠키가 없어 해시 키로 세고 같은 응답에서 `vid`를 준다. 다음 요청은 쿠키로 오므로, 첫 요청 때 새 쿠키 쪽 기록도 같이 남겨 두 번 세지 않게 했다(스크립트 KEYS[3]).
- 방문자 값은 모두 SHA-256 앞 16바이트로 해시해서 키에 쓴다. IP·쿠키 원래 값은 Redis·DB·로그 어디에도 남지 않는다.
- `viewed_at`은 반영 시각이라 실제 본 시각보다 최대 1분 늦다. 하루 단위 통계에는 영향이 거의 없다.
- 로봇 판정은 User-Agent 정규식이고, User-Agent가 비어 있어도 로봇으로 본다. 테스트 브라우저(HeadlessChrome)도 세지 않는다.
- `vid` 쿠키의 Secure는 세션 쿠키 설정(`COOKIE_SECURE`) 또는 HTTPS 요청이면 켠다.

## 확인
- 통합 `ViewTest` 7개: 회원·다른 브라우저·비회원 쿠키·쿠키 거부 중복, 동시 50번 → 1, 작성자·관리자·로봇·링크 미리보기·UA 없음·미리 불러오기 제외(응답은 같은 204), 볼 수 없는 글 404, 반영 도중 멈춘 뒤 이어 하기, 완전 삭제 글 건너뛰기·IP 미저장, 상세 조회수 = 일별 합
- 단위 `ViewRecorderOutageTest`: Redis 장애면 SKIPPED, 오류 없음
- 화면 `views.test.ts` 3개: 1초 뒤 한 번, 탭 가림 시 다시 재기, 화면 밖·정리 시 안 보냄
- 브라우저: 작성자 요청 없음, 독자 1초 뒤 1번, 비회원 HttpOnly `vid`, 안내 툴팁·키보드 초점, 1분 반영 뒤 "조회 2"
