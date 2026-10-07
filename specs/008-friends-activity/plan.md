# 구현 메모: 008 친구 맺기·최근 활동 (v0.8.0)

## 구조
| 파일 | 역할 |
|---|---|
| `friend/application/FriendService` | 요청·수락·삭제. `friendship`의 (작은 번호, 큰 번호) 기본 키로 한 쌍에 한 행. 요청은 `INSERT … ON CONFLICT DO NOTHING` 뒤 `FOR UPDATE`로 읽어 맞요청이면 수락 |
| `friend/application/FriendQuery` | 친구·받은 요청·보낸 요청 목록, 최근 활동(친구 + 양쪽 공개 + 기록 있음일 때만) |
| `friend/application/LastActive` | 한국 날짜 기준 0~7일 구간. 정확한 시각은 내보내지 않는다 |
| `friend/application/FriendEvents` | FriendRequested·FriendAccepted (관계가 실제로 바뀔 때만) |
| `friend/web/FriendController` | `/api/me/friends` 아래 API. 상대는 블로그 주소로 고른다 |
| `account/application/ActivityTracker` + `account/web/ActivityInterceptor` | 로그인 요청마다 부르되 Redis `active:{id}` 키(1시간)로 걸러 DB 쓰기는 한 시간에 한 번. Redis 장애 때는 DB 조건으로 거른다 |
| `discovery/application/FeedQuery.profile` | 블로그 프로필에 `friendship`·`lastActiveDaysAgo` |
| 화면 `lib/friends.ts`, `BlogPage`, `SettingsPage` | [친구 요청]·[요청 취소]·[수락]·[거절]·[친구 끊기], 설정의 친구 영역과 최근 활동 공개 설정 |

## 결정
- 거절·취소·끊기는 모두 같은 `DELETE`다. 어느 쪽이든 관계를 지울 수 있고 상대에게 알리지 않는다. 수락만 요청받은 사람으로 제한한다.
- 이메일 인증 전 회원도 친구 요청을 할 수 있다(A-3, 팔로우와 같게). 요청 폭탄은 하루 100번 제한으로 막는다.
- 최근 활동 표시 위치는 친구의 블로그 프로필과 설정의 친구 목록이다(A-4).
- 친구 공개(`FRIENDS`, US4)는 선택 구현이고 공통 스키마(V1)가 `PUBLIC`/`PRIVATE`만 허용해 넣지 않았다. 넣으려면 스키마 CHECK 변경(V4)과 모든 목록의 공개 조건 변경이 필요하다. 일일 보고 질문으로 올린다.
- 탈퇴 때 친구 관계 삭제는 020에서 한다.

## 확인
- 통합 테스트 `FriendTest` 9개: 요청·수락과 사건, 거절·취소 무흔적, 맞요청·반복, 동시 맞요청 20번, 대상 제한·비회원 401, 수락 권한, 최근 활동 노출 조건·구간, 공개 끄기 양방향, 한 시간 갱신
- 단위 `LastActiveTest`: 한국 날짜 경계
- 브라우저: 두 계정으로 요청 → 설정에서 수락 → 블로그에 "👥 친구 · 최근 활동 오늘" → 공개 끄기 → 사라짐 → 끊기, 비회원은 로그인 화면으로
