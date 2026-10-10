# Feature Specification: Facebook 로그인

**Feature Branch**: `083-facebook-login`
**Created**: 2026-10-10
**Status**: Implemented (키를 넣으면 켜짐)
**근거**: 2026-10-10 블로그 주인 요청 "다음 페이스북도 해줘", "페이스북은 이메일 인증 다시 해야 되는 거 아니야?". 카카오 로그인(080)과 같은 방식이다.

## 사용자 시나리오

1. **Given** 운영자가 `FACEBOOK_CLIENT_ID`(앱 ID)·`FACEBOOK_CLIENT_SECRET`(앱 시크릿 코드)을 넣은 사이트, **When** 로그인 화면을 열면, **Then** 카카오와 GitHub 사이에 파란 [Facebook으로 계속하기] 버튼이 보인다. 키가 없으면 버튼이 없다.
2. **Given** Facebook으로 처음 온 사람, **When** Facebook 동의 화면을 거치면, **Then** 가입 마무리 화면에서 `fb-` 블로그 주소와 닉네임을 정하고 가입한다. Facebook 이름이 닉네임 칸에, 이메일 앞부분이 주소 칸에 미리 들어간다.
3. **Given** Facebook이 이메일을 준 사람, **Then** 이메일을 다시 묻지 않는다. 휴대폰 번호로만 Facebook에 가입했거나 동의 화면에서 이메일 제공을 끈 사람은 가입 마무리 화면에서 이메일을 받아 인증 메일을 보낸다(이메일 없는 GitHub 계정과 같음).
4. **Given** Facebook으로 가입한 회원, **When** 다시 Facebook으로 로그인하면, **Then** Facebook 사용자 id(앱마다 다른 숫자)로 같은 계정에 들어온다. Facebook 이메일이 바뀌어도 같은 계정이다.
5. **Given** 기본 실루엣이 아닌 프로필 사진, **Then** 가입 마무리 화면에서 [Facebook 프로필 사진 사용]을 고를 수 있다. 바로 받지 못하면 서버가 대신 받는다(080 FR-007과 같음). 그래도 못 받으면 기본 이미지로 가입한다.

## Requirements

- **FR-001**: 등록 이름은 `facebook`, 콜백은 `{SITE_BASE_URL}/login/oauth2/code/facebook`. 인가는 `www.facebook.com/v26.0/dialog/oauth`, 토큰은 `graph.facebook.com/v26.0/oauth/access_token`, 사용자 정보는 `graph.facebook.com/v26.0/me?fields=id,name,email,picture.width(512).height(512)`. 앱 시크릿은 요청 본문으로 보낸다.
- **FR-002**: 권한은 `public_profile,email`. 둘 다 Meta 앱 검수 없이 쓸 수 있는 권한이라 카카오 비즈 앱 같은 절차가 없다.
- **FR-003**: Facebook은 확인을 마친 이메일만 돌려주므로 받은 이메일을 인증된 이메일로 쓴다. 정리 규칙은 다른 소셜과 같다(spec 038).
- **FR-004**: 블로그 주소 접두어는 `fb-`. 이메일 가입 주소는 `fb_`로 시작할 수 없고, 이메일 가입 주소 추천은 `fb_`·`ka_`로 시작하면 밑줄을 뺀다. DB는 `fb-` 접두어만 더 받는다(V31).
- **FR-005**: 사진은 `https://platform-lookaside.fbsbx.com`만 받고 `is_silhouette`가 참이면 넘기지 않는다. 가입 마무리 화면 CSP img-src와 서버 대신 받기 허용 목록에 같은 호스트를 더한다.
- **FR-006**: 설정 화면·메일의 로그인 수단 이름은 "Facebook".
- **FR-007**: 로그인 화면 안내 문구는 소셜 이름을 늘어놓지 않고 "소셜 계정으로 처음 오셨다면 블로그 주소와 닉네임을 정하고 가입을 마쳐요."로 쓴다.

## 고른 것과 이유 (질문 없이 진행, 일일 보고에 기록)

- **Graph API 버전을 코드에 적음 (v26.0)**: 버전을 빼면 앱이 쓸 수 있는 가장 오래된 버전으로 처리된다. Spring 기본 등록은 2016년 버전(v2.8)을 적어 두어 쓰지 않았다. 버전은 다음 버전이 나오고 2년 뒤 만료되므로 그 전에 올린다.
- **이메일을 그대로 믿음**: Facebook은 확인되지 않은 이메일을 돌려주지 않는다. 우리 로그인은 이메일이 아니라 (로그인 수단, Facebook id)로 계정을 찾으므로 이메일이 같다고 다른 계정과 이어지지 않는다.
- **버튼 색은 Facebook 파랑(#0866FF), 글자는 흰색**: 흰 글자와 대비가 4.5:1 이상이다.
- **개인정보 처리방침은 아직 그대로**: 받는 항목(이메일·이름·사진)은 이미 처리방침에 있다. 로그인 수단 목록 문구에 카카오·Facebook을 더하면 처리방침 버전이 올라 전 회원 재동의가 필요하므로, 카카오와 묶어 한 번에 고치도록 일일 보고 질문으로 올린다.
- **인스타그램은 여전히 넣지 않음**: 080에 적은 대로 일반 사용자용 Instagram 로그인이 없다.

## 운영자가 할 일

1. [Meta for Developers](https://developers.facebook.com/apps)에서 앱을 만든다. 사용 사례는 "Facebook 로그인으로 사용자 인증 및 정보 요청".
2. 사용 사례 › 맞춤 설정에서 `email` 권한을 "추가"로 둔다(`public_profile`은 기본).
3. Facebook 로그인 › 설정의 유효한 OAuth 리디렉션 URI에 `https://devlog.life/login/oauth2/code/facebook`을 넣는다.
4. 앱 설정 › 기본 설정에 앱 도메인 `devlog.life`, 개인정보처리방침 URL `https://devlog.life/privacy`, 사용자 데이터 삭제 안내 URL `https://devlog.life/privacy`를 넣는다.
5. 앱 ID·앱 시크릿 코드를 GitHub Secret `FACEBOOK_CLIENT_ID`·`FACEBOOK_CLIENT_SECRET`에 넣고 배포한다.
6. 앱 모드를 개발에서 라이브로 바꾼다. 개발 모드에서는 앱 역할(관리자·개발자·테스터)이 있는 계정만 로그인된다.
