-- 061 AI 글 제안·자정 일기.
-- ai_post_proposal: 연결한 AI가 "한 주제가 끝났다"고 보고 남긴 글 제안(제목·범위·태그). 내 글 관리에서 임시글로 만들거나 넘긴다.
-- ai_note: "자정에 일기 쓰기"를 켠 회원의 AI가 작업 단위마다 남기는 짧은 메모. 매일 00:00(KST)에 전날 메모를 일기 임시글로 묶고 지운다.
ALTER TABLE member ADD COLUMN ai_diary_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN member.ai_diary_enabled IS 'AI 메모를 매일 자정에 일기 임시글로 묶을지 (기본 false, 웹 설정에서만 바꾼다)';

CREATE TABLE ai_post_proposal (
    id                     bigserial NOT NULL,
    member_id              bigint NOT NULL,
    title                  varchar(100) NOT NULL,
    scope                  varchar(2000) NOT NULL,
    tags                   varchar(400) NOT NULL DEFAULT '',
    status                 varchar(10) NOT NULL DEFAULT 'OPEN',
    post_id                bigint NULL,
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at             timestamptz NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_ai_post_proposal_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_post_proposal_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE SET NULL,
    CONSTRAINT ck_ai_post_proposal_status CHECK (status IN ('OPEN', 'DRAFTED', 'DISMISSED'))
);

CREATE INDEX ix_ai_post_proposal_member ON ai_post_proposal (member_id, status, created_at DESC);

COMMENT ON TABLE ai_post_proposal IS 'AI(MCP)가 남긴 글 제안 (주제가 끝났을 때 제목·범위·태그)';
COMMENT ON COLUMN ai_post_proposal.id IS '제안 번호';
COMMENT ON COLUMN ai_post_proposal.member_id IS '회원 번호 (토큰 주인)';
COMMENT ON COLUMN ai_post_proposal.title IS '제안한 글 제목';
COMMENT ON COLUMN ai_post_proposal.scope IS '쓸 범위 (Markdown 목록)';
COMMENT ON COLUMN ai_post_proposal.tags IS '제안한 태그 (쉼표로 구분)';
COMMENT ON COLUMN ai_post_proposal.status IS 'OPEN 대기, DRAFTED 임시글로 만듦, DISMISSED 넘김';
COMMENT ON COLUMN ai_post_proposal.post_id IS '이 제안으로 만든 임시글 번호';
COMMENT ON COLUMN ai_post_proposal.created_at IS '제안 일시';
COMMENT ON COLUMN ai_post_proposal.decided_at IS '임시글로 만들거나 넘긴 일시';

CREATE TABLE ai_note (
    id                     bigserial NOT NULL,
    member_id              bigint NOT NULL,
    topic                  varchar(50) NULL,
    content                varchar(1000) NOT NULL,
    tags                   varchar(400) NOT NULL DEFAULT '',
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_ai_note_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE
);

CREATE INDEX ix_ai_note_member ON ai_note (member_id, created_at);

COMMENT ON TABLE ai_note IS 'AI(MCP)가 남긴 하루 작업 메모. 자정에 일기 임시글로 묶고 지운다';
COMMENT ON COLUMN ai_note.id IS '메모 번호';
COMMENT ON COLUMN ai_note.member_id IS '회원 번호 (토큰 주인)';
COMMENT ON COLUMN ai_note.topic IS '주제 (일기의 소제목). NULL이면 기타';
COMMENT ON COLUMN ai_note.content IS '메모 내용 (한두 문장)';
COMMENT ON COLUMN ai_note.tags IS '태그 제안 (쉼표로 구분)';
COMMENT ON COLUMN ai_note.created_at IS '남긴 일시';
