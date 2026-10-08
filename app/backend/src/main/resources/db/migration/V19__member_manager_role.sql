-- 매니저 권한 (spec 062 관리자 페이지): 글·신고·회원·문의를 관리하지만 권한은 주지 못한다. 관리자는 운영자 계정 하나다.
ALTER TABLE member DROP CONSTRAINT ck_member_role;
ALTER TABLE member ADD CONSTRAINT ck_member_role CHECK (role IN ('USER', 'MANAGER', 'ADMIN'));

-- 관리자 회원 목록의 권한 거르기 (일반 회원이 대부분이라 직원만 색인)
CREATE INDEX ix_member_staff ON member (role) WHERE role <> 'USER';
