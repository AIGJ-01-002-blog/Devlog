# 구현 메모: 049 가입 화면의 AI 기능 동의 (v1.25.0)

| 파일 | 바뀜 |
|---|---|
| `account/application/AgreementService` | `recordSignup(memberId, now, agreeAi)`: 동의했으면 AI 행을 함께 저장 |
| `SignupService`, `EmailAccountService` | 가입 폼에 `agreeAi`를 받아 가입 트랜잭션에 넘김 |
| `AuthController`, `EmailAuthController` | 요청의 `agreeAi`는 `Boolean`(없으면 false) |
| `components/SignupAgreements` (새) | 이메일·소셜 가입이 같이 쓰는 동의 묶음. 두 화면에 똑같이 있던 필수 약관 체크박스도 이리로 모음 |
| `pages/TermsPage` | 처리방침 6절에 `id="ai"`와 "선택 항목으로 따로 받는다" 한 문장 |

## 결정
- 요청 필드를 `boolean`이 아니라 `Boolean`으로 받는다. Jackson 3은 기본으로 빠진 원시형을 오류로 보아(FAIL_ON_NULL_FOR_PRIMITIVES), 필드를 안 보내는 이전 화면이 400이 된다.
- 처리방침 버전은 올리지 않는다. 바뀐 문장은 받는 방법을 설명할 뿐 수집 항목·전송처는 그대로다.
- 가입 화면에 새 선택 항목이 생기는 기능 추가라 Minor 버전이다.

## 검증
- `EmailAuthTest`: 이메일 가입에서 동의하면 AI 행이 지금 버전으로 생기고, 소셜 가입에서 안 하면 필수 둘만 남는다.
- `SignupAgreements.test.tsx`: 선택 항목 분리, "모두 동의" 켜고 끄기, AI만 끄면 "모두 동의"도 꺼짐.
