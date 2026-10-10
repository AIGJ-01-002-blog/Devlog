-- 078 디스코드 웹훅 알림: 회원 하나에 웹훅 하나. 주소는 디스코드 공식 주소에서 번호·토큰만 떼어 둔다(다른 곳으로 보내지 않게)
CREATE TABLE member_discord (
    member_id              bigint NOT NULL,
    webhook_id             varchar(32) NOT NULL,
    webhook_token          varchar(128) NOT NULL,
    channel_name           varchar(100),
    notify                 boolean NOT NULL DEFAULT true,
    linked_at              timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_id),
    CONSTRAINT fk_member_discord_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE
);

COMMENT ON TABLE member_discord IS '회원-디스코드 웹훅 연결';
COMMENT ON COLUMN member_discord.member_id IS '회원 번호';
COMMENT ON COLUMN member_discord.webhook_id IS '디스코드 웹훅 번호';
COMMENT ON COLUMN member_discord.webhook_token IS '디스코드 웹훅 토큰 (화면·로그에 내보내지 않음)';
COMMENT ON COLUMN member_discord.channel_name IS '연결할 때 디스코드가 알려 준 웹훅 이름';
COMMENT ON COLUMN member_discord.notify IS '블로그 알림을 디스코드로도 받을지';
COMMENT ON COLUMN member_discord.linked_at IS '연결 일시';
