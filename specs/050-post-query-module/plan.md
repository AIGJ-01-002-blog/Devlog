# 구현 메모: 050 글 조회를 글 모듈로 옮기기 (v1.25.1)

| 파일 | 바뀜 |
|---|---|
| `post/query/PostCardQuery` (새) | 카드 목록·번호로 카드·글 수·최신 공개 글(RSS). 예전 `FeedQuery`의 SQL 전부 |
| `post/query/PostViewQuery` (새) | 글 상세 읽기와 읽기 판정. 예전 `PostDetailQuery`의 SQL |
| `post/query/PostNeighborQuery` (새) | 이전·다음 글. 예전 `AdjacentPostQuery`의 SQL |
| `post/query/PostCard`, `PostCardPage`, `PostFilter`, `PostListSpec` (새) | 카드 형태와 목록 지정. `FeedQuery.Card`/`Page`를 대신함(JSON 같음) |
| `post/access/PostAccessPolicy` | `FRIENDS_LIST_CONDITION` (예전 `FeedQuery.FRIENDS_BLOG_CONDITION`) |
| `follow/application/FollowSql`, `tag/application/TagSql`, `friend/application/FriendSql` (새) | 자기 테이블 조건 조각 |
| `like/application/LikeQuery` (새) | 좋아한 글 번호 쪽, "내가 눌렀나" |
| `friend/application/FriendQuery` | `areFriends(a, b)` |
| `account/application/MemberProfileQuery`, `MemberSql` (새) | 블로그 머리의 회원 정보, 프로필 사진 조각 (`PostSql`은 이를 그대로 씀) |
| `discovery/application/*` | SQL 없이 조립만 |
| `series`, `trending` | discovery가 아니라 `PostCardQuery`를 바로 씀 |

## 결정
- 다른 모듈의 조건은 `PostFilter(sql, arg)`로 받는다. 조각은 코드 안 상수로만 만들고 값은 자리표시자로 넘겨 SQL 주입 여지가 없다.
- 블로그 주인 찾기는 예전처럼 주소의 아이디를 대소문자 그대로 비교한다(`MemberProfileQuery.activeId`). 대문자 주소의 301 처리는 기존대로 PageController가 한다.
- 동작이 바뀌지 않는 정리라 Patch 버전이다.

## 검증
- `./mvnw verify`: 기존 416개 테스트 모두 통과(목록·블로그·태그·팔로잉·좋아한 글·상세·이전/다음·RSS·시리즈·트렌딩 통합 테스트 포함).
