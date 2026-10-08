-- 054 문의·신고 접수와 AI 버그 신고: 회원이 웹에서, 연결한 AI가 MCP(report_bug)로 문의·버그·제안·신고를 남긴다.
-- 관리자만 읽고 처리 상태·답변·고친 버전을 적는다. 답변하면 회원에게 알림(INQUIRY_ANSWERED)이 간다.
CREATE TABLE inquiry (
    id                     bigserial PRIMARY KEY,
    member_id              bigint NOT NULL,
    category               varchar(20) NOT NULL,
    source                 varchar(10) NOT NULL DEFAULT 'WEB',
    title                  varchar(200) NOT NULL,
    content                text NOT NULL,
    page_url               varchar(500),
    tool_name              varchar(60),
    client_name            varchar(80),
    app_version            varchar(20),
    status                 varchar(20) NOT NULL DEFAULT 'RECEIVED',
    answer                 text,
    answered_at            timestamptz,
    fixed_version          varchar(20),
    handled_by             bigint,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_inquiry_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
    CONSTRAINT fk_inquiry_handled_by FOREIGN KEY (handled_by) REFERENCES member (id) ON DELETE SET NULL,
    CONSTRAINT ck_inquiry_category CHECK (category IN ('QUESTION', 'BUG', 'SUGGESTION', 'REPORT')),
    CONSTRAINT ck_inquiry_source CHECK (source IN ('WEB', 'MCP')),
    CONSTRAINT ck_inquiry_status CHECK (status IN ('RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    CONSTRAINT ck_inquiry_answer CHECK ((answer IS NULL) = (answered_at IS NULL))
);
CREATE INDEX ix_inquiry_member ON inquiry (member_id, created_at DESC, id DESC);
CREATE INDEX ix_inquiry_status ON inquiry (status, created_at DESC, id DESC);

COMMENT ON TABLE inquiry IS '문의·신고 (웹 또는 AI가 MCP로 접수)';
COMMENT ON COLUMN inquiry.id IS '문의 번호';
COMMENT ON COLUMN inquiry.member_id IS '접수한 회원 번호 (AI가 신고하면 토큰 주인)';
COMMENT ON COLUMN inquiry.category IS '종류: QUESTION 문의, BUG 버그·오류, SUGGESTION 제안, REPORT 신고';
COMMENT ON COLUMN inquiry.source IS '접수 경로: WEB 화면, MCP 연결한 AI';
COMMENT ON COLUMN inquiry.title IS '제목 (200자까지)';
COMMENT ON COLUMN inquiry.content IS '본문 Markdown (20,000자까지)';
COMMENT ON COLUMN inquiry.page_url IS '문제가 난 화면 주소 (웹 접수)';
COMMENT ON COLUMN inquiry.tool_name IS '문제가 난 MCP 도구 이름 (AI 접수)';
COMMENT ON COLUMN inquiry.client_name IS '신고한 AI 앱 또는 토큰 이름';
COMMENT ON COLUMN inquiry.app_version IS '접수 때의 devlog 버전';
COMMENT ON COLUMN inquiry.status IS '처리 상태: RECEIVED 접수, IN_PROGRESS 처리 중, RESOLVED 해결, CLOSED 닫힘';
COMMENT ON COLUMN inquiry.answer IS '관리자 답변';
COMMENT ON COLUMN inquiry.answered_at IS '답변 시각';
COMMENT ON COLUMN inquiry.fixed_version IS '고친 버전 (릴리스 노트로 이어진다)';
COMMENT ON COLUMN inquiry.handled_by IS '마지막으로 처리한 관리자 번호';
COMMENT ON COLUMN inquiry.created_at IS '접수 시각';
COMMENT ON COLUMN inquiry.updated_at IS '마지막 변경 시각';

-- 답변 알림 (운영 알림이라 끌 수 없다)
ALTER TABLE notification DROP CONSTRAINT ck_notification_type;
ALTER TABLE notification ADD CONSTRAINT ck_notification_type
    CHECK (type IN ('COMMENT', 'REPLY', 'LIKE', 'FOLLOW', 'NEW_POST', 'REPORT_RESOLVED', 'CONTENT_HIDDEN', 'INQUIRY_ANSWERED'));

CREATE TABLE notification_inquiry (
    notification_id        bigint NOT NULL,
    type                   varchar(30) NOT NULL DEFAULT 'INQUIRY_ANSWERED',
    inquiry_id             bigint NOT NULL,
    PRIMARY KEY (notification_id),
    CONSTRAINT fk_notification_inquiry_notification FOREIGN KEY (notification_id, type) REFERENCES notification (id, type) ON DELETE CASCADE,
    CONSTRAINT fk_notification_inquiry_inquiry FOREIGN KEY (inquiry_id) REFERENCES inquiry (id) ON DELETE CASCADE,
    CONSTRAINT ck_notification_inquiry_type CHECK (type = 'INQUIRY_ANSWERED')
);
CREATE INDEX ix_notification_inquiry_inquiry ON notification_inquiry (inquiry_id);

COMMENT ON TABLE notification_inquiry IS '문의 답변 알림 대상';
COMMENT ON COLUMN notification_inquiry.notification_id IS '알림 번호';
COMMENT ON COLUMN notification_inquiry.type IS '알림 종류';
COMMENT ON COLUMN notification_inquiry.inquiry_id IS '문의 번호';
