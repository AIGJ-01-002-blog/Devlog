# 065 가입 화면 아이디 확인과 이메일 인증번호

요청: 민서님(2026-10-09) "회원가입 시 아이디 중복검사와 사용 가능 여부를 이메일 인증 버튼과 함께 검사하고, 인증도 회원가입 페이지에서 진행"

## 동작
- 아이디는 로그인에 쓰는 이메일이다. 치는 동안 `GET /api/emails/availability`로 형식·가입 여부(AVAILABLE·INVALID·TAKEN·WITHDRAWN)를 보여 준다.
- 이메일 칸 옆 [인증] → `POST /api/auth/signup/email-code {email}`: 아이디를 다시 확인하고 6자리 번호를 메일로 보낸다(202, `expiresInSeconds`).
  - 번호는 10분, 마지막 것만 유효, Redis에는 해시만. 이메일마다 1분 1번·하루 10번, IP 1시간 20번.
- [확인] → `POST /api/auth/signup/email-code/verify {email, code}`: 맞으면 이 브라우저 세션에 인증한 이메일을 30분 둔다. 틀리면 CODE_MISMATCH(남은 횟수), 5번째에 번호를 버리고 CODE_TOO_MANY_TRIES, 없으면 CODE_EXPIRED.
- `POST /api/auth/signup/email`은 인증번호가 필요한 환경에서 세션의 인증 이메일과 다르면 `EMAIL_NOT_VERIFIED`(400, email 칸). 맞으면 인증된 채 가입되고 링크 메일을 보내지 않는다.
- 화면: 아이디 사용 가능 + 블로그 주소 사용 가능 + 이메일 인증이 모두 끝나야 [가입하기]가 켜진다. 버튼에는 툴팁(title)을 단다.

## 고른 것과 이유
- **인증번호(6자리) 방식**: 링크는 다른 탭이 열려 가입 화면을 떠나게 된다. 같은 화면에서 끝내려면 번호가 맞다(velog도 가입 전 메일 인증).
- **요구 조건 `blog.auth.signup-email-code`(SIGNUP_EMAIL_CODE) auto|on|off**: auto는 SMTP로 실제 메일을 보내거나 개발 환경(보관함 /api/dev/mails)일 때만 요구한다. 운영에 SMTP가 아직 없어 번호를 받을 수 없는데 요구하면 아무도 가입하지 못하기 때문이다. 그때는 예전처럼 가입 뒤 링크 인증(004)으로 둔다.
- **이메일 가입 여부 노출**: 가입 응답(EMAIL_TAKEN)이 이미 알려 주는 범위와 같고, 확인 요청은 IP 1분 30번 제한을 공유한다.
- **인증 상태는 세션에**: 다른 브라우저가 남의 인증을 쓸 수 없고, 저장소를 늘리지 않는다.
