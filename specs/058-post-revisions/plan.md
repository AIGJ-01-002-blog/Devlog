# 구현 메모: 058 글 수정 이력 (v1.33.0)

| 파일 | 바뀜 |
|---|---|
| `V17__post_revision.sql` | `post_revision(post_id, revision_no)` 기본 키, `post` FK `ON DELETE CASCADE`, 발행한 글 1판 채우기 |
| `revision/application/PostRevisionRecorder` | `PublishExtension.onPublish`에서 판 추가, 50판 넘으면 정리 |
| `revision/application/PostRevisionQuery`, `revision/web/PostRevisionController` | 목록·한 판 읽기, 작성자 확인 |
| 화면 | `components/RevisionHistory`(창), `components/TextDiff`(충돌 창에서 떼어 낸 비교), `lib/revisions`, `pages/WritePage`(버튼·불러오기) |
| 테스트 | `PostRevisionTest` 5개, `revisions.test.ts` 1개, `MigrationTest` 테이블 수 40 |

## 결정
- **발행본만 남긴다**: 자동 저장은 1분마다 쌓여 판이 너무 많아진다. 독자가 실제로 본 내용이 기준이라 발행 때만 남긴다.
- **판 번호는 글 안에서**: 작성자에게 "3판"이 전체 일련번호보다 읽기 쉽다. 기본 키 `(post_id, revision_no)`.
- **되돌리기 = 불러오기**: 서버에서 바로 발행본을 바꾸면 태그·사진 연결·알림 같은 발행 확장을 건너뛴다. 편집기로 불러와 평소 발행을 타게 했다.
- **불러오기 전 내용은 이 기기 백업**: 백업 불러오기(006)와 같은 규칙으로, 어느 쪽도 모르게 사라지지 않는다.
- 화면에 보이는 기능이 늘어나므로 Minor 버전이다.
