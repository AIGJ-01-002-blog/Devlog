-- AI 일기 시각 고르기와 글 제안 알림 (spec 071).
-- 일기를 만드는 시각을 회원이 고른다(한국 시간 0~23시, 기본 0시 = 자정). AI가 글을 제안하면 알림을 보낸다.
ALTER TABLE member ADD COLUMN ai_diary_hour smallint NOT NULL DEFAULT 0;
ALTER TABLE member ADD CONSTRAINT ck_member_ai_diary_hour CHECK (ai_diary_hour BETWEEN 0 AND 23);
COMMENT ON COLUMN member.ai_diary_hour IS 'AI 메모를 일기로 묶는 시각 (한국 시간 0~23시, 기본 0 = 자정)';
COMMENT ON COLUMN member.ai_diary_enabled IS 'AI 메모를 매일 고른 시각에 일기로 묶을지 (기본 false, 웹 설정에서만 바꾼다)';

ALTER TABLE notification DROP CONSTRAINT ck_notification_type;
ALTER TABLE notification ADD CONSTRAINT ck_notification_type
    CHECK (type IN ('COMMENT', 'REPLY', 'LIKE', 'FOLLOW', 'NEW_POST', 'REPORT_RESOLVED', 'CONTENT_HIDDEN', 'INQUIRY_ANSWERED', 'AI_PROPOSAL'));

-- AI 글 제안 알림은 끌 수 있다
ALTER TABLE notification_mute DROP CONSTRAINT ck_notification_mute_type;
ALTER TABLE notification_mute ADD CONSTRAINT ck_notification_mute_type
    CHECK (type IN ('COMMENT', 'REPLY', 'LIKE', 'FOLLOW', 'NEW_POST', 'AI_PROPOSAL'));

CREATE TABLE notification_ai_proposal (
    notification_id        bigint NOT NULL,
    type                   varchar(30) NOT NULL DEFAULT 'AI_PROPOSAL',
    proposal_id            bigint NOT NULL,
    PRIMARY KEY (notification_id),
    CONSTRAINT fk_notification_ai_proposal_notification FOREIGN KEY (notification_id, type) REFERENCES notification (id, type) ON DELETE CASCADE,
    CONSTRAINT fk_notification_ai_proposal_proposal FOREIGN KEY (proposal_id) REFERENCES ai_post_proposal (id) ON DELETE CASCADE,
    CONSTRAINT ck_notification_ai_proposal_type CHECK (type = 'AI_PROPOSAL')
);
CREATE INDEX ix_notification_ai_proposal_proposal ON notification_ai_proposal (proposal_id);

COMMENT ON TABLE notification_ai_proposal IS 'AI 글 제안 알림 대상';
COMMENT ON COLUMN notification_ai_proposal.notification_id IS '알림 번호';
COMMENT ON COLUMN notification_ai_proposal.type IS '알림 종류';
COMMENT ON COLUMN notification_ai_proposal.proposal_id IS '제안 번호';
