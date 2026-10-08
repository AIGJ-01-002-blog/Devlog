# 구현 메모: 047 글 썸네일 고르기 (v1.23.0)

| 파일 | 바뀜 |
|---|---|
| `V12__post_thumbnail.sql` | `post_thumbnail(post_id PK, resource_id NULL)`. 행 없음 = 본문 첫 사진, 사진 있는 행 = 고른 사진, 사진 없는 행 = 없앰 |
| `media/PostThumbnailLinker` (PublishExtension) | 검증(내 사진인지, 고르기·없애기 동시 요청), 발행 트랜잭션에서 행 교체. 빠진 사진은 연결 해제 시각 기록 |
| `PublishCommand`, `PostController`, `PostCommandService` | 요청 `thumbnailUrl`·`thumbnailHidden` 전달. 멱등 키 해시에 포함 |
| `post/infra/PostSql.THUMBNAIL_KEY` | 고른 사진 → 없으면(행 없음) 본문 첫 사진. 목록·상세·검색·시리즈가 그대로 따라온다 |
| `PostImageCleanupJob`, `PostImagePurgeHook` | 고른 썸네일은 정리하지 않고, 글 완전 삭제 때 연결 해제 |
| `PostEditorQuery` | 에디터 응답에 `thumbnailUrl`·`thumbnailHidden` |
| `components/ThumbnailPicker`, `lib/postThumbnail`, `pages/WritePage` | 발행 창 썸네일 칸. 올리는 중에는 [발행하기]를 막는다 |
| 테스트 | `PostThumbnailTest` 3개, `postThumbnail.test.ts` 3개, `ThumbnailPicker.test.tsx` 2개 |

## 결정
- 본문 첫 사진은 본문에서 계산되는 값이라 저장하지 않는다(V3). 작성자가 고른 것만 저장한다.
- 태그·사진 연결처럼 발행 확장(PublishExtension)으로 붙여 발행 서비스와 `post` 엔터티는 썸네일을 모른다. 프로필 사진(`member_profile_image`)과 같은 1:1 연결 테이블이다.
- "없앰"을 따로 열로 두지 않고 사진 없는 행으로 표현해 한 테이블·한 행으로 세 상태를 나타낸다. 고른 사진이 지워지면 FK `ON DELETE CASCADE`로 행이 사라져 본문 첫 사진으로 돌아간다("없앰"으로 바뀌지 않는다).
- 원본·썸네일 주소 어느 쪽을 보내도 같은 사진으로 찾는다.
- 화면에 보이는 기능이 늘어나므로 Minor 버전이다.
