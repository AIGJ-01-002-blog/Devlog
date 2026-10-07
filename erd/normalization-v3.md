# V3 정규화: 지적 사항 5가지 반영

- 날짜: 2026-10-07
- ERD: https://crowfoot.java21.net/workspaces/61/models/660 (테이블 28개, 관계 50개, 요구사항 27건 모두 반영)
- 마이그레이션: [V3__normalize_schema.sql](V3__normalize_schema.sql) (V1·V2 다음에 적용, 기존 데이터 이전 포함)
- 원칙(REQ-025): 다른 값에서 계산할 수 있는 값은 저장하지 않는다. 수는 COUNT 쿼리로 구하고, 무거운 계산 결과는 DB 밖 캐시(Redis)에 둔다.

## 한눈에 보기

| 지적 사항 | 전 (V1) | 후 (V3) | 성능은 이렇게 지킨다 |
|---|---|---|---|
| ① 본문·렌더링 본문 중복 | `post.content_md` + `content_html` + `excerpt` + `thumbnail_url` + `render_version` | `content_md` 하나 | HTML은 읽을 때 렌더링하고 Redis에 캐시. 요약은 `left(content_md, 600)`만 읽음 |
| ② 댓글 자기참조 재귀 | `parent_id`만 있고 깊이 제한은 앱 규칙 | 답글의 부모는 최상위 댓글만 가능하도록 DB가 강제 | 재귀 없이 인덱스 두 번(최상위 20개 + LATERAL 답글 3개) |
| ③ 조회수를 글 단위로 저장 | `post.view_count`·`like_count`·`comment_count` + `post_view_daily` | 조회 이벤트 `post_view` + `post_stat` 뷰 | `(post_id, viewed_at)` 인덱스로 COUNT. 커지면 아래 대안 |
| ④ 알림 정규화 위반 | 한 테이블에 종류별 대상 컬럼(post·comment·report·result·group_key)과 파생 컬럼(last_actor·actor_count) | 공통 `notification` + 종류별 하위 테이블 4개 | 목록은 공통 테이블만 읽고, 대상은 PK 조인 |
| ⑤ 사진 → 리소스, 첨부파일 통합 | `image`(상태·용도 컬럼) + `post_image` | `resource` + `resource_image`·`resource_file`, `post_image`·`post_file`(각각 다대다), `member_profile_image` | 종류별 FK로 사진·파일이 섞이지 않음 |

## ① 본문과 렌더링 본문

**무엇이 문제였나.** `content_html`, `excerpt`, `thumbnail_url`은 모두 `content_md`에서 계산되는 값이다. 원문을 고치고 HTML을 갱신하지 않으면 두 값이 어긋난다. 렌더링 규칙이 바뀌면 모든 글을 다시 렌더링하는 배치(`render_version`)도 필요했다.

**바꾼 것.** `post`에는 `content_md`만 남겼다.
- 상세: 읽을 때 렌더링·정화하고 Redis에 `post:{id}:{edit_version}:{렌더 규칙 버전}` 키로 캐시한다. 글을 고치면 edit_version이 바뀌어 캐시가 저절로 바뀐다. 렌더링 규칙을 바꿔도 버전만 올리면 된다(재렌더링 배치 불필요).
- 목록 요약: `left(content_md, 600)`만 읽어 앱이 요약을 만든다. PostgreSQL 12부터 압축된 긴 텍스트도 앞부분만 풀어서 읽는다.
- 대표 이미지: `post_image`의 `position = 0` 사진의 썸네일.

**대안.** 트래픽이 아주 커지면 렌더링 결과를 별도 캐시 테이블(`post_render(post_id, edit_version, html)`)에 두는 방법이 있다. 이것도 원본이 아니라 캐시라서 지워도 다시 만들 수 있다.

## ② 댓글 재귀

**무엇이 문제였나.** 자기참조(`parent_id`)는 깊이가 정해지지 않으면 `WITH RECURSIVE` 쿼리가 필요하고, 깊어질수록 느려진다.

**바꾼 것.** spec 011은 답글을 1단계로 정한다(답글에 답하면 같은 최상위 아래에 달림). 이 규칙을 DB가 막도록 했다.
- 생성 컬럼 `is_root = (parent_id IS NULL)`, `parent_is_root = (parent_id가 있으면 true)`
- FK `(post_id, parent_id, parent_is_root) → comment(post_id, id, is_root)`

답글이 답글을 부모로 가리키면 `(…, false)`를 찾게 되어 FK 위반이다. 다른 글의 댓글도 부모가 될 수 없다. 둘 다 PostgreSQL에서 확인했다.

깊이가 1로 고정되므로 재귀가 없다.

```sql
-- 최상위 20개 + 각 최상위의 처음 답글 3개 (ix_comment_root, ix_comment_reply)
SELECT c.*, r.*
FROM (SELECT * FROM comment WHERE post_id = :postId AND parent_id IS NULL
      ORDER BY created_at, id LIMIT 20) c
LEFT JOIN LATERAL (SELECT * FROM comment x WHERE x.parent_id = c.id
                   ORDER BY created_at, id LIMIT 3) r ON true;
```

**대안(여러 단계 답글이 필요해질 때).**

| 방식 | 장점 | 단점 |
|---|---|---|
| 클로저 테이블 `comment_tree(ancestor_id, descendant_id, depth)` | 어떤 깊이든 조인 한 번, 정규형 유지 | 답글 하나에 깊이만큼 행이 늘어남 |
| 경로 열거 `path = '0001.0005.0012'` | 정렬·하위 조회가 인덱스 범위 검색 | 경로가 부모 정보를 중복 저장(정규화 위반) |
| 중첩 집합 `lft, rgt` | 읽기 매우 빠름 | 쓰기마다 많은 행을 갱신 |

지금 규칙에서는 1단계 고정이 가장 단순하고 빠르다. 여러 단계로 바꾸면 클로저 테이블을 추천한다.

**측정 결과.** 댓글 102만 개로 두 방식을 비교했다([comment-structure-benchmark.md](comment-structure-benchmark.md)). 지금 방식은 상세 첫 화면이 0.23ms로 클로저 테이블 0.71ms보다 약 3배 빨랐고, 답글 쓰기도 1.7배 빨랐다. 저장 공간은 클로저 테이블의 56%였다.

## ③ 조회수·좋아요 수·댓글 수

**무엇이 문제였나.** `post.view_count`는 `post_view_daily` 합계와 같은 값을 두 곳에 저장했다. `like_count`는 `post_like` 행 수, `comment_count`는 `comment` 행 수와 같다. 동시에 갱신하면 어긋날 수 있고, 인기 글 한 행에 쓰기가 몰린다.

**바꾼 것.**
- `post_view(id, post_id, viewed_at)`: 조회 한 번 = 한 행. 24시간 같은 방문자 중복 판정과 방문자 식별은 Redis에서 하고 통과한 조회만 쌓는다. 방문자 식별값은 DB에 남기지 않는다.
- `post_stat` 뷰가 조회수·좋아요 수·댓글 수(삭제·숨김 제외)를 센다. 목록에서는 `WHERE post_id IN (...)`로 화면에 나온 글만 센다.
- 인덱스: `ix_post_view_post (post_id, viewed_at)`는 글별 수와 일별 통계에, `ix_post_view_recent (viewed_at, post_id)`는 트렌딩 최근 N시간 집계에 쓴다. `ix_comment_visible`은 댓글 수에 쓴다.
- 기존 `post_view_daily` 데이터는 그날 정오(KST) 조회로 옮겼다.

**대안(조회가 수백만 건 단위로 커질 때).**
1. Redis 카운터로 화면에 보여 주고 원본은 `post_view`로 유지한다. Redis가 날아가도 원본에서 다시 셀 수 있다.
2. 시간별 요약 머티리얼라이즈드 뷰를 주기적으로 `REFRESH`한다. 원본이 아니라 재계산 가능한 캐시다.
3. `post_view`를 월별 파티션으로 나누고 오래된 파티션은 요약 후 보관한다.

## ④ 알림

**무엇이 문제였나.** 알림 종류마다 쓰는 컬럼이 달라 대부분의 컬럼이 NULL이었다(댓글 알림은 comment_id만, 신고 결과는 report_id·result만). 종류와 컬럼의 짝은 CHECK로만 막았다. `last_actor_id`·`actor_count`는 `notification_actor`에서 계산되는 값이었고, `result`는 신고 사건 상태에서 계산되는 값이었다.

**바꾼 것.** `notification`에는 받는 사람, 종류, 읽은 일시, 생성·수정 일시만 남겼다. 종류별 대상은 하위 테이블(1:1)로 나눴다.

| 종류 | 하위 테이블 | 행위자 |
|---|---|---|
| COMMENT, REPLY | `notification_comment(comment_id)` | 댓글 작성자 |
| LIKE, NEW_POST | `notification_post(post_id)` | 좋아요는 `notification_actor`, 새 글은 글 작성자 |
| REPORT_RESOLVED | `notification_report(report_id)` | 결과는 신고 사건 상태 |
| CONTENT_HIDDEN | `notification_case(case_id)` | 대상과 당시 내용은 사건 스냅샷 |
| FOLLOW | 없음 | `notification_actor` |

- 하위 테이블이 `(notification_id, type)`을 FK로 가리키므로 LIKE 알림이 댓글 하위 테이블에 들어갈 수 없다.
- 마지막 행위자·행위자 수는 `ix_notification_actor_latest (notification_id, created_at DESC)`로 센다.
- "안 읽은 묶음 알림은 하나" 규칙은 V1에서 `group_key` 부분 유니크 인덱스였다. 이제 앱이 `pg_advisory_xact_lock(받는 사람, 종류, 글)`으로 지킨다. 다른 테이블의 읽음 상태를 조건으로 거는 유니크 제약은 만들 수 없어서다.

## ⑤ 사진 → 리소스, 첨부파일

**무엇이 문제였나.** 사진만 저장할 수 있었고, 상태(TEMP·ATTACHED)와 용도(POST·PROFILE)는 연결 테이블에 행이 있는지로 알 수 있는 값이었다.

**바꾼 것.**
- `resource`: 올린 사람, 저장 경로, 형식, 크기, 종류(`IMAGE`·`FILE`), 연결 해제 일시, 생성 일시. 사진·파일 형식과 크기 제한은 종류별 CHECK로 막는다(사진 10MB, 파일 20MB).
- `resource_image`(가로·세로·썸네일)와 `resource_file`(원래 파일 이름): `(resource_id, kind)`를 FK로 가리켜 사진 행이 파일 속성을 갖지 못한다.
- 글-사진 `post_image(post_id, resource_id, position)`과 글-첨부파일 `post_file(post_id, resource_id, position)`을 따로 다대다로 연결한다. `post_image`는 `resource_image`만, `post_file`은 `resource_file`만 FK로 가리키므로 종류가 섞이지 않는다. 이것도 PostgreSQL에서 확인했다.
- 프로필 사진: `member_profile_image(member_id PK, resource_id UNIQUE)`. 회원당 한 장이고, 바꾸기는 UPSERT 한 문장이다.
- 정리 배치: 어느 연결 테이블에도 없고 `created_at`(올린 뒤 연결 안 됨) 또는 `detached_at`(연결이 끊김)이 기준을 넘은 리소스.

## 남겨 둔 것과 이유

- `report_case.snapshot_title`·`snapshot_content`: 신고한 순간의 내용을 남기는 이력이다. 원본이 고쳐지거나 지워져도 관리자가 검토해야 하므로 중복이 아니다.
- `comment.is_root`·`parent_is_root`: DB가 계산하는 생성 컬럼이다. 사람이 값을 넣지 않아 어긋날 수 없고, 답글 깊이 규칙을 FK로 강제하는 데만 쓴다.
- `post_draft`: 발행본과 다른 "작업 중인 내용"이라 같은 값을 두 번 저장하는 것이 아니다.

## Crowfoot ERD에 대해

- Crowfoot 관계는 기본 키만 가리킬 수 있다. 그래서 복합 FK 세 가지는 ERD에서 단일 FK로 그려지고, 정확한 정의는 테이블 설명과 Flyway에 있다: 댓글 `(post_id, parent_id, parent_is_root)`, 알림 하위 테이블 `(notification_id, type)`, 리소스 하위 테이블 `(resource_id, kind)`.
- `post_stat` 뷰와 부분 인덱스(`ix_comment_visible` 등)도 Flyway에만 있다.
- 처음 가져올 때 1:1로 잘못 그려진 연결 관계 13개(좋아요, 태그, 팔로우, 친구, 알림 행위자 등)를 1:N으로 고쳤다.
- 지운 컬럼에 걸려 있던 CHECK 7개(`resource`: ck_image_purpose·ck_image_dim·ck_image_thumb_size, `post`: ck_post_counts, `notification`: ck_notification_group·ck_notification_result·ck_notification_count)는 Crowfoot 도구로 지울 수 없어 남아 있다. 화면에서 지우면 되고, 그 전까지 Crowfoot DDL 내보내기는 이 7개 때문에 실행되지 않는다. Flyway에는 영향이 없다.

## 앱 코드에 미치는 영향 (구현 스레드용)

| 코드 | 바뀌는 점 |
|---|---|
| `PostDetailQuery`, `PageController` | `content_html` 대신 `content_md`를 읽어 `ContentRenderer`로 렌더링하고 Redis 캐시 |
| `FeedQuery` | `excerpt`·`thumbnail_url` 대신 `left(content_md, 600)` + `post_image` position 0 조인, 수는 `post_stat` |
| `FeedQuery`, `PostDetailQuery` 프로필 사진 | `image ... purpose='PROFILE'` 조인 → `member_profile_image` → `resource_image` |
| `MyPostsQuery` | `view_count`·`like_count`·`comment_count` → `post_stat` 조인 |
| `Post` 엔티티, `PostCommandService.publish` | `contentHtml`·`excerpt`·`thumbnailUrl`·`renderVersion`·`viewCount` 필드 제거. 발행 때 사진 연결은 `post_image`에 position과 함께 기록 |
| 조회수(013), 댓글(011), 알림(015), 사진(009) | 아직 구현 전이라 처음부터 V3 구조로 만든다 |
