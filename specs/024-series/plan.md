# 구현 메모: 024 시리즈 (v1.13.0)

## 구조
| 파일 | 역할 |
|---|---|
| `V8__series.sql` | `series(id, member_id→member, name, slug, created_at, updated_at, UNIQUE(member_id, slug))`, `series_post(post_id PK→post, series_id→series, position, UNIQUE(series_id, position) 커밋 때 확인)`. 글 하나는 시리즈 하나(FR-002)를 기본 키로 지킨다. 글 수·대표 사진은 저장하지 않고 읽을 때 센다(V3 정규화 원칙) |
| `series/application/SeriesNames` | 이름 정리(NFC, 제어·서식 문자 제거, 공백 하나로)와 주소(소문자, 글자·숫자가 아닌 것은 `-`) |
| `series/application/SeriesService` | 만들기(회원 행 잠금으로 100개 제한), 이름 바꾸기(주소도 바뀜), 지우기(글은 남음), 글 넣기·빼기(글 → 시리즈 순서로 잠가 교착 없음, 맨 뒤에 붙임, 200개 제한), 순서 바꾸기. 순서 바꾸기는 주인 화면에 보이는 글(발행·휴지통 아님)만 받고, 보이지 않는 휴지통 글·임시글은 빼지 않고 맨 뒤에 남긴다(FR-005) |
| `series/application/SeriesQuery` | 블로그 시리즈 목록, 시리즈 페이지, 글 상세의 시리즈 상자. 보이는 글 조건은 보는 사람에 따라 하나만 고른다: 주인(발행·휴지통 아님), 친구(`FeedQuery.FRIENDS_BLOG_CONDITION`), 그 밖(`PostAccessPolicy.PUBLIC_LIST_CONDITION`). 카드는 `FeedQuery.cards(ids, condition)`(트렌딩과 같은 한 번 조회)로 읽는다 |
| `series/web/SeriesController` | `GET /api/members/{handle}/series`, `GET …/series/{slug}`, `GET·PUT /api/posts/{id}/series`, `GET·POST /api/me/series`, `PATCH·DELETE /api/me/series/{id}`, `PUT /api/me/series/{id}/posts`. 친구·주인 응답은 `no-store` |
| `SeriesWithdrawalPurgeStep` (15) | 탈퇴 정리 때 시리즈를 지운다(FR-006). 글 정리(10) 뒤 |
| `PageController` | `/@{handle}/series`, `/@{handle}/series/{slug}` 첫 화면. 남에게 보이는 글이 없으면 404 |
| 화면 | `lib/series.ts`, 글쓰기 `SeriesPicker`(고르면 바로 저장, 새 시리즈 만들기), 글 상세 `SeriesBox`(이름·순서/전체·목록·이전/다음), 블로그 [글]·[시리즈] 탭, 시리즈 페이지(주인: 순서 편집·빼기·이름 바꾸기·삭제) |

## 결정
- **시리즈는 글쓰기 화면에서 바로 저장**한다. 발행 요청에 넣지 않아 임시글도 미리 넣어 둘 수 있고, 발행 API를 바꾸지 않는다
- **이름이 바뀌면 주소도 바뀐다**(velog와 같음). 옛 주소는 404다. 옮김 기록을 두지 않는다
- **읽을 수 있는 글이 없는 시리즈는 남에게 없는 시리즈**다(목록에서 빠지고 페이지는 404). 비공개 글만 모은 시리즈가 있다는 사실도 드러나지 않는다
- 계정 상태 필터: 메일 인증 전에는 시리즈를 만들거나 바꾸지 못한다(글쓰기와 같은 규칙)

## 확인
- 서버 `SeriesTest` 4개: 넣기·옮기기·빼기와 남의 글 404, 보는 사람별 목록·순서·개수(비회원·남·친구·주인)와 첫 화면, 휴지통·복구·순서 바꾸기·빼기·이름 바꾸기·삭제, 탈퇴 정리
- `MigrationTest` 테이블 31개
- 화면 `series.test.ts` (이전·다음 글, 이름 검사, 주소)
