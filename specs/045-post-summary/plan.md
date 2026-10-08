# 구현 메모: 045 글 짧은 소개 (v1.22.0)

| 파일 | 바뀜 |
|---|---|
| `V11__post_summary.sql` | `post.summary varchar(150) NULL`, 비어 있지 않음 CHECK |
| `post/domain/Post`, `PublishCommand`, `PostInput`, `PostCommandService`, `PostController` | 발행 요청의 `summary`를 정리·검증해 발행과 같은 트랜잭션에서 저장. 같은 요청 판단(멱등 키 해시)에 포함 |
| `PostEditorQuery` | 에디터 응답에 `summary` (발행 창 미리 채우기) |
| `post/infra/PostSql.SUMMARY_SOURCE`, `ContentRenderer.summary` | 목록·RSS가 소개를 읽고, 소개가 없을 때만 본문 앞 600자를 읽어 요약 |
| `PostDetailQuery` | `excerpt`(공유 설명에도 씀)에 소개 우선 |
| `pages/WritePage`, `lib/postSummary` | 발행 창 소개 칸·글자 수(서버와 같은 정리·코드 포인트 기준). 소개 오류면 창을 닫지 않음 |
| 테스트 | `PostSummaryTest` 2개, `postSummary.test.ts` 3개 |

## 결정
- V3에서 지운 `excerpt`는 본문에서 계산되는 값이라 중복이었다. 소개는 작성자가 입력한 값이라 저장한다. 비우면 NULL이고 계산한 요약을 저장하지 않는다.
- 글 하나에 하나뿐이고 150자로 짧아 1:1 테이블이 아닌 `post` 열로 둔다. 목록 쿼리에 조인이 늘지 않는다.
- 소개가 있는 글은 목록 쿼리가 본문 앞부분을 읽지 않는다(`CASE WHEN p.summary IS NULL`).
- 길이 상한은 DB 열과 묶여 있어 설정값이 아닌 상수(`PostInput.MAX_SUMMARY`)로 둔다.
- 화면에 보이는 기능이 늘어나므로 Minor 버전이다.
