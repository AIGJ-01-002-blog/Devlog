-- 023 텔레그램 연결: 회원 하나에 텔레그램 대화 하나 (FR-003)
CREATE TABLE member_telegram (
    member_id              bigint NOT NULL,
    chat_id                bigint NOT NULL,
    notify                 boolean NOT NULL DEFAULT true,
    linked_at              timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_id),
    CONSTRAINT fk_member_telegram_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
    CONSTRAINT uq_member_telegram_chat UNIQUE (chat_id)
);

COMMENT ON TABLE member_telegram IS '회원-텔레그램 대화 연결';
COMMENT ON COLUMN member_telegram.member_id IS '회원 번호';
COMMENT ON COLUMN member_telegram.chat_id IS '텔레그램 대화 번호';
COMMENT ON COLUMN member_telegram.notify IS '블로그 알림을 텔레그램으로도 받을지';
COMMENT ON COLUMN member_telegram.linked_at IS '연결 일시';
