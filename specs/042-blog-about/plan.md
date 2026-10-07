# 구현 메모: 042 블로그 소개 탭 (v1.19.0)

| 파일 | 바뀜 |
|---|---|
| `V9__member_about.sql` (새로) | `member_about(member_id PK·FK, content_md, updated_at)`. 비어 있으면 행 없음, 1~10,000자 CHECK |
| `account/application/MemberAbout` (새로) | 읽기(핸들 → 회원 + 소개 LEFT JOIN 1번), 저장(upsert), 비우면 삭제 |
| `account/web/AboutController` (새로) | `GET /api/members/{handle}/about`, `PUT /api/me/about` |
| `AboutWithdrawalPurgeStep` (새로) | 탈퇴 정리 순서 16 |
| `RenderedHtmlCache` | 키를 받는 `html(key, …)`로 일반화하고 글 메서드는 그대로 위임. 소개 키 `render:about:{회원}:{원문 SHA-256 앞 16바이트}:{규칙}` |
| `PostImageCleanupJob` | "쓰지 않는 사진" 조건에 소개 원문 확인 추가 (PK 조회) |
| `PageController` | `/@{handle}/about` 서버 렌더링 (소개 HTML, 소개 없으면 noindex) |
| `components/BlogAbout` (새로), `BlogPage`, `App` | [소개] 탭, 읽기·쓰기·수정, 글자 수 |
| 테스트 | `AboutTest` 4개, `PostImageTest` 정리 경우 추가, `BlogAbout.test.tsx` 4개 |

## 결정
- 소개는 길고 드물게 읽혀 자주 읽는 `member` 행을 넓히지 않도록 1:1 테이블로 둔다(행이 없으면 소개 없음, NULL 칸을 두지 않음).
- HTML은 저장하지 않는다(V3). 글과 같은 Redis 캐시를 쓰고, 키는 원문 해시라 내용이 바뀌면 새 키를 쓰고 옛 키는 TTL로 사라진다.
- 처음에는 버전 칸을 키로 썼지만, 소개를 비우면(행 삭제) 다시 쓸 때 버전이 1로 돌아가 지운 예전 소개가 캐시에서 다시 보였다(코드 리뷰 지적, 테스트로 재현). 원문 해시로 바꾸고 버전 칸은 없앴다.
- 렌더러·캐시·사진 규칙을 글과 함께 쓰고 따로 만들지 않는다.
- 고치기 전 정리 코드에서 소개에만 든 사진이 지워지는 것을 테스트로 확인했다.
- 새 기능이라 Minor 버전이다.
