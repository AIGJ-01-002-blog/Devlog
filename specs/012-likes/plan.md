# 구현 메모: 012 좋아요 (v1.1.0)

## 구조
| 파일 | 역할 |
|---|---|
| `like/application/LikeService` | 상태 지정(`INSERT … ON CONFLICT DO NOTHING` / `DELETE`), 검사 순서, 요청 제한, 사건 |
| `like/application/LikeEvents` | `PostLiked`·`PostUnliked`(글, 작성자, 누른 사람, 시각). 실제로 바뀐 경우만 |
| `like/web/LikeController` | `PUT`·`DELETE /api/posts/{id}/like` → `{ liked, likeCount }` |
| `discovery/application/PostDetailQuery` | 글 상세 `liked`(PK 조회 1번, 작성자·비회원은 false) |
| 화면 `lib/likes.ts`, `components/LikeButton.tsx` | 즉시 반영·0.3초 묶기·실패 되돌리기, 안내 문구 |

## 결정
- 좋아요 수는 저장하지 않고 `post_like` 행을 센다(V3 `post_stat`). 그래서 동시에 누르고 취소해도 수가 실제와 어긋날 수 없고, FR-011 매일 보정 작업은 필요 없다(보정할 숫자가 없음).
- 검사 순서는 docs/42 §3: 로그인 → 계정 상태(AccountStateFilter, `PUT|DELETE /api/posts/{id}/like`) → 볼 수 있나(404) → 자기 글(403) → 요청 제한(429). 작성자 본인에게 임시·숨김 글은 "볼 수 있음"이라 발행·숨김 여부를 따로 확인해 404로 맞췄다.
- 화면 묶기: 응답이 오기 전에 다시 누르면 늦게 온 응답으로 화면을 덮지 않고, 앞 요청이 끝난 뒤 마지막 상태를 다시 판단해 보낸다(`createLikeSync`).
- 1만 이상 표시는 내림(`compactNumber`), 이전의 반올림을 고쳤다.
- 탈퇴 30일 정리 때 좋아요 지우기(FR-025)는 020 탈퇴에서 한다(`post_like.member_id`가 RESTRICT라 정리 작업이 먼저 지워야 함).

## 확인
- 통합 `LikeTest` 4개: 누름·취소·같은 요청 반복·사건 1번·상세 `liked`, 동시성(같은 사람 20번, 20+20 섞기 3회, 50명, 50 취소 + 8 누름), 비회원 401·자기 글 403·볼 수 없는 글 404·숨김/휴지통 보존, 60번 제한과 `Retry-After`
- `EmailAuthTest`: 인증 전 좋아요 403 `EMAIL_NOT_VERIFIED`
- 화면 `likes.test.ts` 7개(즉시 반영, 연타, 되돌림, 늦은 응답, 숫자 표시)
- 브라우저: 작성자 개수만, 누르면 즉시 ♥, 새로고침 뒤 유지, 연타 5번 → 요청 1번, Space 키, 실패 되돌림, 비회원 로그인 안내(돌아올 주소)
