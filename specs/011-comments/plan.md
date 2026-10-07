# 구현 메모: 011 댓글 (v0.11.0)

## 구조
| 파일 | 역할 |
|---|---|
| `comment/application/CommentText` | 정리(줄 단위 공백·제어 문자 정리, 빈 줄 여러 개는 하나)와 검사(필수, 1000자 = 코드 포인트) |
| `comment/application/CommentQuery` | 글 관문(`gate`: 발행 + `PostAccessPolicy.canRead`, 숨김 글은 읽기만), 최상위 20개 페이지(앞·뒤 커서, `around`), 답글은 창 함수로 댓글마다 3개, 답글 더 보기, 댓글 수(`post_stat` 뷰) |
| `comment/application/CommentService` | 쓰기·수정·삭제. 요청 제한, Redis 중복 거르기(`cmt:dedupe:*` 10초), 잠금 순서 답글 → 최상위 |
| `comment/application/CommentEvents` | `CommentCreated`·`CommentDeleted` (알림 017에서 받는다) |
| `comment/web/CommentController`, `page/PageController` | API, 글 첫 화면 HTML에 댓글 첫 페이지 |
| 화면 `lib/comments.ts`, `components/Comments.tsx`, `pages/PostPage` | 목록 합치기·자리 남기기 계산, 댓글 영역 |

## 결정
- 답글 1단계는 V3의 FK로 강제한다. 답글에 답하면 `parent_id`는 최상위, `reply_to_member_id`는 그 답글 작성자(내 답글이면 비움).
- 댓글 수는 컬럼이 아니라 집계 뷰다(정규화 v3). 자리만 남은 댓글·숨김 댓글은 세지 않는다.
- 답글이 있는 최상위를 지우면 내용을 비우고 `deleted_at`만 둔다. 마지막 답글이 지워질 때 같은 트랜잭션에서 빈 자리도 지운다.
- 삭제와 답글이 동시에 오면 행 잠금(FOR SHARE / FOR UPDATE)으로 순서를 정한다. 먼저 지워졌으면 답글은 400 `REPLY_TARGET_UNAVAILABLE`.
- 같은 내용을 10초 안에 다시 보내면(더블 클릭, 재전송) 처음 댓글을 200으로 돌려준다. Redis가 안 되면 거르지 않고 저장한다.
- 내용은 텍스트 노드로만 그리고 줄바꿈은 CSS `pre-line`으로 보인다(HTML·Markdown 해석 안 함).
- 신고·숨김 처리 화면은 019, 알림은 017에서 이어 붙인다.

## 확인
- 통합 `CommentTest` 12개: 쓰기·정리·길이, 비회원·인증 전 401/403, 읽을 수 없는 글 404, 답글 1단계·대상, 수정됨·같은 내용, 자리 남기기·빈 자리 정리, 동시 삭제+답글, 중복 거르기, 요청 제한, 페이지·around, 공격 문자열
- 화면 `comments.test.ts` 4개
- 브라우저: 빈 상태 → 줄바꿈 댓글, 작성자 답글·배지, 답글에 답글 "@닉네임에게", 수정됨, 자리 남기기와 정리, 답글 더 보기, `?comment=` 강조, 비회원 안내·모바일 화면
