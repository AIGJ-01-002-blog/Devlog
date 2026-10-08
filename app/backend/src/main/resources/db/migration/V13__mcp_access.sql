-- 052 devlog MCP 서버: 회원이 자기 AI 도구(Claude·Cursor·Codex·ChatGPT)를 devlog에 연결하는 접근 토큰(개인 토큰·OAuth)과,
-- AI가 만든 임시글에 붙는 태그 제안·발행 요청. 토큰 원문은 저장하지 않고 SHA-256 해시만 둔다.
CREATE TABLE oauth_client (
    client_id              varchar(64) NOT NULL,
    client_name            varchar(100) NOT NULL,
    redirect_uris          text NOT NULL,
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (client_id)
);

COMMENT ON TABLE oauth_client IS 'OAuth로 연결하는 AI 앱 (ChatGPT 등). 동적 등록(RFC 7591)으로 앱이 스스로 등록한다';
COMMENT ON COLUMN oauth_client.client_id IS '공개 클라이언트 번호 (비밀값 없음, PKCE로 확인)';
COMMENT ON COLUMN oauth_client.client_name IS '앱이 알린 이름. 동의 화면에 보인다';
COMMENT ON COLUMN oauth_client.redirect_uris IS '허용한 돌아갈 주소 (줄바꿈으로 구분)';

CREATE TABLE personal_access_token (
    id                     bigint GENERATED ALWAYS AS IDENTITY,
    member_id              bigint NOT NULL,
    name                   varchar(40) NOT NULL,
    token_hash             char(64) NOT NULL,
    token_prefix           varchar(12) NOT NULL,
    scope                  varchar(10) NOT NULL,
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at             timestamptz NULL,
    last_used_at           timestamptz NULL,
    revoked_at             timestamptz NULL,
    oauth_client_id        varchar(64) NULL,
    refresh_hash           char(64) NULL,
    refresh_expires_at     timestamptz NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_personal_access_token_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
    CONSTRAINT fk_personal_access_token_client FOREIGN KEY (oauth_client_id) REFERENCES oauth_client (client_id) ON DELETE CASCADE,
    CONSTRAINT uq_personal_access_token_hash UNIQUE (token_hash),
    CONSTRAINT uq_personal_access_token_refresh UNIQUE (refresh_hash),
    CONSTRAINT ck_personal_access_token_scope CHECK (scope IN ('READ', 'WRITE'))
);

CREATE INDEX ix_personal_access_token_member ON personal_access_token (member_id, created_at DESC);

COMMENT ON TABLE personal_access_token IS 'MCP 연결용 접근 토큰. 개인 토큰 1개 또는 OAuth 연결 1개가 한 행';
COMMENT ON COLUMN personal_access_token.member_id IS '회원 번호';
COMMENT ON COLUMN personal_access_token.name IS '회원이 붙인 이름 (예: 회사 노트북 Claude)';
COMMENT ON COLUMN personal_access_token.token_hash IS '토큰 SHA-256 (16진수). 원문은 만들 때 한 번만 보여 준다';
COMMENT ON COLUMN personal_access_token.token_prefix IS '목록에서 알아보는 앞부분 (dvl_ + 4자)';
COMMENT ON COLUMN personal_access_token.scope IS 'READ = 읽기만, WRITE = 읽기 + 임시글 쓰기';
COMMENT ON COLUMN personal_access_token.expires_at IS '만료 일시 (NULL = 만료 없음)';
COMMENT ON COLUMN personal_access_token.last_used_at IS '마지막 사용 일시 (10분 단위로 갱신)';
COMMENT ON COLUMN personal_access_token.revoked_at IS '폐기 일시';
COMMENT ON COLUMN personal_access_token.oauth_client_id IS 'OAuth 연결이면 앱 번호 (NULL = 회원이 직접 만든 개인 토큰)';
COMMENT ON COLUMN personal_access_token.refresh_hash IS 'OAuth 갱신 토큰 SHA-256. 쓸 때마다 새로 바꾼다';
COMMENT ON COLUMN personal_access_token.refresh_expires_at IS 'OAuth 연결 만료 일시 (갱신 토큰 만료)';

CREATE TABLE post_ai_hint (
    post_id                bigint NOT NULL,
    tags                   varchar(400) NOT NULL DEFAULT '',
    publish_requested_at   timestamptz NULL,
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id),
    CONSTRAINT fk_post_ai_hint_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE
);

COMMENT ON TABLE post_ai_hint IS 'AI(MCP)가 만든 임시글의 태그 제안과 발행 요청';
COMMENT ON COLUMN post_ai_hint.post_id IS '글 번호';
COMMENT ON COLUMN post_ai_hint.tags IS 'AI가 제안한 태그 (쉼표로 구분). 발행 창에 미리 채운다';
COMMENT ON COLUMN post_ai_hint.publish_requested_at IS 'AI가 발행을 요청한 일시. 발행은 작성자가 화면에서 한다';
