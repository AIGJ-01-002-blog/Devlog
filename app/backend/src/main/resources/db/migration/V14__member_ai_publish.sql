-- 053 AI 발행·삭제 허용: 회원이 설정 › AI 연결에서 켜면 연결한 AI(MCP)가 글을 바로 발행하거나 휴지통으로 옮길 수 있다.
-- 기본은 꺼짐. 로그인한 웹 화면에서만 바꿀 수 있고 접근 토큰(MCP·OAuth)으로는 바꿀 수 없다.
ALTER TABLE member ADD COLUMN ai_publish_allowed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN member.ai_publish_allowed IS 'AI(MCP)가 발행·삭제하도록 허용했는지 (기본 false, 웹 설정에서만 바꾼다)';
