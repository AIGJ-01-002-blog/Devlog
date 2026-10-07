# 구현 메모: 038 소셜 로그인 이메일을 가입과 같은 규칙으로 (v1.16.11)

| 파일 | 바뀜 |
|---|---|
| `account/application/SocialProfile` | 기본 생성자에서 `verifiedEmail`을 `EmailAddress.normalize`로 정리하고, `isValid`가 아니면 null |
| `account/infra/oauth/OAuth2LoginHandlers` | Google 이메일의 소문자 변환(NPE 원인)을 지우고 값만 넘긴다 |
| `account/infra/oauth/GithubOAuth2UserService` | 공백 제거·소문자 변환을 지우고 값만 넘긴다. 테스트용으로 API 주소를 받는 생성자 추가 |
| `SocialProfileTest` 2개, `OAuth2LoginHandlersTest` 5개, `GithubOAuth2UserServiceTest` 4개 (모두 새로) | 정리·규칙 밖 값, GitHub·Google 프로필 옮기기와 이메일 인증 여부, 실패 이동, 가짜 GitHub API로 대표·인증 이메일 고르기·목록 실패·다른 수단 |

## 결정
- 정리를 레코드 생성자에 둔다. 개발용 로그인과 세션에 보관했다 되살린 가입 대기 프로필도 같은 규칙을 거친다.
- 규칙 밖 이메일은 거부하지 않고 "인증 이메일 없음"으로 본다. 로그인 자체는 막지 않고 가입 마무리 화면에서 고쳐 받는다.
- Google NPE 테스트는 고치기 전 코드에서 실패하는 것을 확인했다.
- 버그 고침이라 Patch 버전이다.
