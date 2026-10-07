# 구현 메모: 017 트렌딩 (v1.6.0)

## 구조
| 파일 | 역할 |
|---|---|
| `trending/application/TrendingRanker` | 점수 계산 쿼리 하나: 후보(공개 목록 조건 + 처음 공개 7일 안) → 점수 → 작성자당 3개 → 상위 N |
| `trending/application/TrendingService` | 10분마다(한 서버) 상위 100개 순위표를 Redis에 30분 보관, 커서로 보던 순위표 이어 보기, 장애 시 바로 계산 |
| `trending/web/TrendingController` | `GET /api/posts/trending?cursor=` (만료 410 `TRENDING_EXPIRED`) |
| `discovery/application/FeedQuery.publicCards` | 번호 목록 → 카드 (쿼리 한 번, 공개 조건 재확인, 받은 순서 유지) |
| `page/PageController` | `/?tab=trending` 서버 화면에 첫 9개 |
| 화면 `pages/HomePage.tsx`, `components/Feed.tsx`, `lib/trending.ts` | [최신] [트렌딩] 탭, 만료 안내 후 처음부터 |

## 결정
- 점수 `(3×좋아요 + 2×작성자 외 댓글 작성자 수 + 0.1×조회수) ÷ (경과 시간 + 2)^1.5`. 수는 `post_like`·`post_view`·`comment`에서 센다(저장하지 않음, 사건으로 세지 않음).
- 숨긴 댓글도 삭제된 댓글처럼 댓글 점수에서 뺀다(A-3 미결 사항을 "운영이 숨긴 반응은 순위에 쓰지 않는다"로 정함).
- 순위표: `trending:snapshot:{만든 시각 ms}` = 글 번호 쉼표 목록, `trending:current` = 지금 순위표 번호. 둘 다 30분 보관. 지금 순위표가 없으면(서버 시작 직후 등) 첫 요청이 만든다.
- 커서 = `{순위표 번호, 다음 위치}`. 이어 볼 때 그 사이 볼 수 없게 된 글은 건너뛰고 다음 글로 9개를 채운다. 순위표가 없어졌으면 410이고 화면은 "순위가 새로 바뀌었어요" 뒤 처음부터 받는다.
- Redis 장애면 그 자리에서 계산한 첫 9개를 [더 보기] 없이 내고 저장하지 않는다(`no-store`). 평소 응답은 누구나 같아 1분 공개 캐시.

## 확인
- 통합 `TrendingTest` 5개: 나이 감쇠 순서, 8일 지난 글·반응 없는 글·자기 댓글만·조회만·비공개·탈퇴 신청 작성자 제외, 댓글 점수(서로 다른 남 수, 삭제 제외), 작성자당 3개, 보던 순위표로 이어 보기(새 순위표·비공개·휴지통 건너뛰기, 13개 중복 없음), 만료 410·고친 커서 400·없으면 바로 만들기, 빈 순위·서버 화면
- 브라우저: 탭 이동과 안내 문구, 서버 화면 탭 상태, 만료 응답 → 안내 후 처음부터
