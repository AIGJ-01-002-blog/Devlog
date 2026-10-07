# 구현 메모: 016 팔로우·피드 (v1.5.0)

## 구조
| 파일 | 역할 |
|---|---|
| `follow/application/FollowService` | 팔로우·언팔로우 상태 지정. 기본 키 충돌 무시 + 바뀐 행이 있을 때만 사건 |
| `follow/application/FollowQuery` | 팔로워·팔로잉 수(탈퇴 신청 제외)와 목록(최근순 20개, 보는 사람의 팔로우 여부를 같은 쿼리로) |
| `follow/application/FollowEvents` | `Followed`·`Unfollowed` 사건 |
| `follow/web/FollowController` | `PUT·DELETE /api/members/{handle}/follow`, `GET /api/members/{handle}/followers`·`/following`, `GET /api/feed` |
| `discovery/application/FeedQuery.following` | 홈과 같은 공개 조건·정렬·카드 9개 + "내가 팔로우한 사람" 조건 |
| `FeedQuery.BlogProfile` | `followerCount`·`followingCount`·`following` 추가 |
| `PostDetailQuery.Author.following` | 글 상세 작성자 영역 버튼 상태 |
| `post/application/PostEvents.PostFirstPublic` | 처음 "발행 + 전체 공개"가 된 순간(발행·공개 범위 변경 어디서든) 한 번 |
| `notification/application/NotificationService.followed·unfollowed·newPost` | 새 팔로워 묶음 알림, 팔로우한 사람의 새 글 알림 |
| `page/PageController` | `/@주소/followers`·`/following` 서버 화면(수집 거부), `/feed` 껍데기 |
| 화면 `components/FollowButton`, `pages/FollowsPage`, `pages/FeedPage`, `lib/follow.ts` | 버튼, 목록, 피드, 헤더 [피드] |

## 결정
- 팔로우 수는 저장하지 않고 센다(정규화 원칙, A-4). `ix_follow_followee`·`ix_follow_follower`가 있어 1만 명도 인덱스로 센다.
- 피드는 `author_id IN (SELECT followee_id FROM follow WHERE follower_id = ?)` 조건 하나를 홈 목록 쿼리에 더한 것이다. 요청마다 팔로우를 다시 읽어 언팔로우가 다음 요청부터 반영된다. 커서 목록 이름은 `feed:{회원}`이라 다른 목록의 커서는 400이다.
- 빈 피드 문구를 고르려고 첫 쪽에만 `followsAnyone`을 같이 보낸다.
- 버튼은 누르는 즉시 바뀌고, 보내는 중 다시 누르면 끝난 뒤 마지막 상태만 보낸다. 실패하면 서버가 마지막으로 확인한 상태로 돌린다. [언팔로우] 글자는 마우스를 올리거나 키보드 초점일 때만 보인다(팔로우 직후 마우스가 그대로 있어도 바로 바뀌지 않음).
- 새 팔로워 알림: 받는 사람마다 안 읽은 묶음 하나, 같은 사람은 7일에 한 번(묶음 참여 기록 기준). 안 읽은 동안 언팔로우하면 묶음에서 빠진다. 읽은 뒤 7일 안에 다시 팔로우하면 알리지 않는다.
- 새 글 알림: 팔로워 전원에게 문장 하나(INSERT … SELECT)로 만든다. 처리 시점에 공개 목록 조건을 벗어났으면 만들지 않는다. 끈 사람·탈퇴 신청한 사람은 뺀다.
- 탈퇴 30일 정리의 팔로우 관계 삭제(FR-028)는 탈퇴 기능(020)과 함께 넣는다. 지금은 탈퇴 신청 회원을 수·목록·피드에서 빼기만 한다.

## 확인
- 통합 `FollowTest` 6개: 상태 지정·수·자기 자신 400·없는/탈퇴 신청 404·비회원 401, 동시 20번 → 관계 1개·알림 1개, 새 팔로워 묶음·언팔로우·7일 규칙, 새 글 알림(비공개 → 공개 한 번, 껐다 켜도 한 번, 끈 사람·탈퇴 제외), 피드(공개 글만, 넘기는 중 새 글에도 중복·누락 없음, 언팔로우·탈퇴·복구, 커서 400), 목록(최근순 20개, 버튼 상태, 커서, 탈퇴 제외·복구, 빈 목록, 404, 서버 화면 noindex)
- 화면 `follow.test.ts` 3개
- 브라우저: 비회원 [팔로우] → 로그인 후 돌아올 주소, 빈 피드 문구, 블로그에서 팔로우 즉시 반영·[언팔로우] 표시, 피드 카드, 새 팔로워 알림 → 팔로워 블로그, 목록에서 맞팔로우, 글 상세 작성자 버튼과 실패 되돌리기, 새 글 알림
