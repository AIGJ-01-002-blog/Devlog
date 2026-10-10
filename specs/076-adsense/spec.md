# Feature Specification: 구글 애드센스 광고 싣기

**Feature Branch**: `076-adsense`
**Created**: 2026-10-10
**Status**: Implemented (v1.52.0)
**근거**: 2026-10-10 블로그 주인 요청("구글 애드센스도 달아서 블로그 운영하고 싶은데"). 애드센스 "사이트 소유권 확인" 단계에서 코드 스니펫·ads.txt·메타 태그 중 하나를 골라야 한다.

## 사용자 시나리오

1. **Given** 애드센스 게시자 ID가 설정된 사이트, **When** 애드센스가 첫 화면을 읽으면, **Then** head에 `adsbygoogle.js?client=ca-pub-…` 코드가 있어 소유권이 확인된다.
2. **Given** 공개 화면(첫 화면·글·블로그·태그·검색 등 검색에 노출하는 화면), **When** 방문자가 열면, **Then** 광고 코드가 실행되고 승인 뒤에는 애드센스 화면에서 켠 자동 광고가 뜬다.
3. **Given** 로그인·글쓰기·설정·관리·RSS 안내·없는 페이지처럼 noindex인 화면, **Then** 광고 코드를 싣지 않고 기존 CSP(`script-src 'self'`)를 그대로 쓴다.
4. **Given** 누구나, **When** `/ads.txt`를 열면, **Then** `google.com, pub-…, DIRECT, f08c47fec0942fa0` 한 줄을 받는다.
5. **Given** 운영자가 `ADSENSE_CLIENT`를 비우면, **Then** 광고 코드와 ads.txt(404)가 모두 꺼진다.

## Requirements

- **FR-001**: 게시자 ID는 `blog.adsense.client`(환경 변수 `ADSENSE_CLIENT`, 기본 `ca-pub-5861067712842534`)다. 페이지 소스에 보이는 공개 값이라 비밀값이 아니다. `ca-pub-숫자` 형식이 아니면 꺼진 것으로 본다(HTML에 넣지 않는다).
- **FR-002**: 광고를 싣는 화면은 요청마다 새 nonce(16바이트)를 만들어 광고 코드, theme.js, 앱 모듈, modulepreload에 모두 붙인다.
- **FR-003**: 그 화면의 CSP는 애드센스가 지원하는 엄격한 CSP를 따른다: `script-src 'nonce-…' 'strict-dynamic' 'unsafe-inline' 'unsafe-eval' https: http:`, `object-src 'none'`, `base-uri 'none'`. 광고 iframe·사진·요청을 위해 `frame-src`·`img-src`·`connect-src`에 `https:`를 연다. `frame-ancestors 'none'`, `form-action 'self'`는 그대로다.
- **FR-004**: 광고 자리는 코드로 박지 않는다. 승인 뒤 애드센스 화면의 자동 광고로 위치·개수를 조절한다.
- **FR-005**: 개인정보 처리방침에 "7. 광고와 쿠키"(광고를 싣는 화면, 제3자 쿠키, 맞춤 광고 끄는 곳, 회원 정보를 넘기지 않음)를 둔다.

## 고른 기본값 (질문 없이 정함)
- 소유권 확인은 코드 스니펫으로 했다. 광고를 띄우려면 어차피 필요한 코드라 확인과 게재가 한 번에 끝난다. ads.txt도 함께 둔다(없으면 애드센스가 수익 경고를 띄운다).
- 허용 목록 CSP 대신 nonce + 'strict-dynamic'을 골랐다. 애드센스 도움말이 "광고 코드가 쓰는 도메인이 수시로 바뀌어 엄격한 CSP만 지원한다"고 밝힌다. 'unsafe-inline'·https:는 nonce를 아는 브라우저가 무시하므로 실제로 도는 스크립트는 nonce가 붙은 것과 그것이 불러온 것뿐이다.
- 광고는 noindex 화면에 싣지 않는다. 글쓰기·설정 화면의 광고는 쓰는 사람을 방해하고, 애드센스 정책상 내용이 없는 화면의 광고는 승인에 불리하다. 공개 화면에서 앱 안 이동으로 글쓰기 화면에 가면 이미 받은 광고 코드가 남을 수 있다(새로 고치면 사라진다).
- 개인정보 처리방침 버전(동의 버전)은 올리지 않았다. 올리면 모든 회원에게 다시 동의를 받는 화면이 뜬다. 공지 방식은 일일 보고 질문으로 올렸다.
  - 2026-10-10 블로그 주인 답 "재동의 받기"로 spec 077(v1.53.0)에서 버전을 올렸다.
