-- 079 팔로워·팔로잉 목록 공개 설정 (민서님 요청 2026-10-10).
-- 끄면 본인과 관리자만 목록을 보고, 다른 사람에게는 "비공개 계정입니다"만 보인다. 팔로워·팔로잉 수는 그대로 보인다.
ALTER TABLE member ADD COLUMN follow_list_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN member.follow_list_public IS '팔로워·팔로잉 목록을 다른 사람에게 보이는지 (기본 true, 끄면 본인·관리자만 본다)';
