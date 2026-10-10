-- 카카오 로그인 (spec 080): 로그인 수단에 KAKAO, 블로그 주소에 ka- 접두어를 더한다.
-- 이메일 가입 주소가 ka_로 시작하지 못하게 하는 규칙은 애플리케이션(HandlePolicy)에서만 막는다.
-- 이미 ka_로 시작하는 이메일 가입 주소가 있으면 DB 규칙에 넣는 순간 그 회원의 정보 수정이 모두 실패하기 때문이다.
ALTER TABLE auth_identity DROP CONSTRAINT ck_auth_provider;
ALTER TABLE auth_identity ADD CONSTRAINT ck_auth_provider CHECK (provider IN ('LOCAL', 'GITHUB', 'GOOGLE', 'KAKAO'));

ALTER TABLE member DROP CONSTRAINT ck_member_handle;
ALTER TABLE member ADD CONSTRAINT ck_member_handle
    CHECK (handle ~ '^((go|gi|ka)-)?[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$' AND handle !~ '^(go|gi)_');
