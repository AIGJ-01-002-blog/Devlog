# 구현 메모: 044 글 아래 작성자 소셜 정보 (v1.21.0)

| 파일 | 바뀜 |
|---|---|
| `discovery/application/PostDetailQuery` | `Author`에 `socialLinks` 칸 추가, 043의 `SocialLinks.of`(회원 PK 범위 조회 1번)로 채움 |
| `pages/PostPage`, `lib/types` | 작성자 영역에 043의 `SocialLinkList` 재사용 |
| 테스트 | `SocialLinksTest`에 글 상세 경우 1개 |

## 결정
- 화면 부품·정리 규칙은 043 것을 그대로 쓰고 새로 만들지 않는다.
- 글 상세 응답에 붙여 따로 요청하지 않는다. 늘어나는 조회는 PK 범위 조회 1번이다.
- 화면에 보이는 기능이 늘어나므로 Minor 버전이다.
