# 구현 메모: 040 이전·다음 글 (v1.18.0)

| 파일 | 바뀜 |
|---|---|
| `discovery/application/AdjacentPostQuery` (새로) | 글 읽기 판정(`PostAccessPolicy`) 뒤, 기준 글 CTE + 양쪽 이웃 `UNION ALL` 쿼리 1번. 친구면 `FeedQuery.FRIENDS_BLOG_CONDITION`·`published_at`, 아니면 `PostAccessPolicy.PUBLIC_LIST_CONDITION`·`first_public_at` |
| `DiscoveryController` | `GET /api/posts/{postId}/adjacent` → `{prev, next}`. 읽을 수 없으면 404 |
| `components/AdjacentPosts` (새로) | 작성자 소개 아래 두 칸 링크. 좁은 화면은 위아래. 실패하면 그리지 않음 |
| `AdjacentPostTest` 3개, `AdjacentPosts.test.tsx` 3개 | 순서·끝 글·다른 작성자 제외·휴지통 건너뜀·캐시 헤더, 친구 목록 포함과 남의 404, 비공개 글 이웃 없음·없는 글·잘못된 번호 404 / 링크·한쪽만·없음과 실패 |

## 결정
- 이웃을 고르는 조건은 블로그 목록과 같은 상수를 쓰고, "지금 글이 목록에 있는가"도 같은 조건으로 CTE에서 판단한다. Java에서 조건을 다시 쓰지 않는다.
- 쿼리는 블로그 목록 인덱스(`ix_post_blog`, `ix_post_blog_friends`)를 양쪽으로 한 칸씩만 읽는다. 새 인덱스는 없다.
- 글 상세 응답에 넣지 않고 따로 읽는다. 상세(서버 렌더링 포함)는 그대로 빠르고, 이웃은 본문 아래라 늦게 와도 된다(시리즈 상자와 같은 방식).
- 새 기능이라 Minor 버전이다.
