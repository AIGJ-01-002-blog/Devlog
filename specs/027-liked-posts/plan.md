# 구현 메모: 027 좋아한 글 (v1.16.0)

| 파일 | 역할 |
|---|---|
| `FeedQuery.liked` | 좋아요 행을 `ix_post_like_member(member_id, created_at DESC)` 순서로 10개 읽으며 지금 읽을 수 있는 글만 거른다(공개 글, 또는 친구 공개 글이고 아직 친구). 카드는 `cards(ids, FRIENDS_BLOG_CONDITION)`로 순서대로 읽는다 |
| `DiscoveryController` | `GET /api/me/liked-posts` (`no-store`) |
| 화면 | `LikedPage`(`Feed` 재사용), 메뉴 [좋아한 글], 첫 화면 목록에 `/lists/liked` |

## 결정
- velog 읽기 목록의 "최근 읽은 포스트"는 넣지 않았다. 지금 조회는 회원별 기록을 남기지 않고(004 조회수는 익명 집계) 읽은 기록을 새로 저장하려면 개인정보 보관 기간·삭제 규칙을 정해야 해서, 열린 질문으로 올린다.

## 확인
- 서버 `LikedPostsTest`: 최근 순, 비공개 전환·친구 끊기 뒤 빠짐, 9개씩 이어 받기, 비로그인 401, no-store
