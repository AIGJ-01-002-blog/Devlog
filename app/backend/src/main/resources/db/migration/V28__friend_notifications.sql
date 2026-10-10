-- 친구 요청·수락 알림 (spec 015 A-1, 민서님 요청 2026-10-10).
-- 알림 대상 표 없이 notification_actor에 요청한 사람·수락한 사람을 적는다. 둘 다 알림 설정에서 끌 수 있다.
ALTER TABLE notification DROP CONSTRAINT ck_notification_type;
ALTER TABLE notification ADD CONSTRAINT ck_notification_type
    CHECK (type IN ('COMMENT', 'REPLY', 'LIKE', 'FOLLOW', 'NEW_POST', 'REPORT_RESOLVED', 'CONTENT_HIDDEN', 'INQUIRY_ANSWERED', 'AI_PROPOSAL',
                    'FRIEND_REQUEST', 'FRIEND_ACCEPTED'));

ALTER TABLE notification_mute DROP CONSTRAINT ck_notification_mute_type;
ALTER TABLE notification_mute ADD CONSTRAINT ck_notification_mute_type
    CHECK (type IN ('COMMENT', 'REPLY', 'LIKE', 'FOLLOW', 'NEW_POST', 'AI_PROPOSAL', 'FRIEND_REQUEST', 'FRIEND_ACCEPTED'));
