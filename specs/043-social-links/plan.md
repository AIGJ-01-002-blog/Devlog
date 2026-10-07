# 구현 메모: 043 블로그 소셜 정보 (v1.20.0)

| 파일 | 바뀜 |
|---|---|
| `V10__member_social_link.sql` (새로) | `member_social_link(member_id, kind, value)`, PK `(member_id, kind)`, 종류 CHECK, 회원 삭제 시 함께 삭제 |
| `account/application/SocialLinks` (새로) | 종류별 정리·검사, 읽기(회원 PK 범위 조회 1번), 저장(회원 행 잠금 → 지우고 일괄 삽입, 트랜잭션 하나) |
| `account/web/SocialLinksController` (새로) | `PUT /api/me/social-links` (정리한 값을 돌려줌) |
| `SocialLinksWithdrawalPurgeStep` (새로) | 탈퇴 정리 순서 17 |
| `FeedQuery.BlogProfile`, `MemberSettingsService.Settings` | `socialLinks` 칸 추가 (블로그 프로필·설정 응답에 함께 옴) |
| `lib/socialLinks`, `components/SocialLinkList`·`SocialLinksForm` (새로), `BlogPage`, `SettingsPage` | 블로그 머리 링크, 설정 입력 칸 |
| 테스트 | `SocialLinksTest` 4개(동시 저장 포함), `MigrationTest` 테이블 수 33, `SocialLinks.test.tsx` 4개 |

## 결정
- 종류마다 `member`에 칸을 두지 않고 (회원, 종류)당 한 행으로 둔다. 빈 값을 NULL 칸으로 두지 않고(행 없음), 종류가 늘어도 스키마가 그대로다.
- GitHub·X·Facebook은 아이디만 저장하고 주소는 화면에서 만든다. 행마다 같은 주소 앞부분을 되풀이하지 않고, 서비스 주소가 바뀌어도(twitter.com → x.com) 데이터를 고치지 않는다.
- 읽기는 블로그 프로필·설정 응답에 붙여 따로 요청하지 않게 했다. 저장 API만 따로 둔다.
- 홈페이지는 http(s)만 받아 `javascript:` 같은 주소가 링크로 나가지 않는다.
- 새 기능이라 Minor 버전이다.
- 같은 회원이 동시에 저장하면 지우고 다시 넣는 사이에 기본 키가 겹쳐 500이 났다(코드 리뷰 지적, 동시 저장 테스트로 재현). 저장 전에 회원 행을 잠가 차례로 처리한다. `ON CONFLICT`만으로는 보내지 않은 칸을 지우지 못해 쓰지 않았다.
