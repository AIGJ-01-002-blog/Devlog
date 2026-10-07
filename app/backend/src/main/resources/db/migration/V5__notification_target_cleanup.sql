-- 알림 대상이 사라지면 알림도 사라지게 한다 (015 FR-013·FR-015).
-- 알림은 공통 행(notification) + 종류별 대상 행(notification_comment·post·report·case)으로 나뉘어 있어(V3),
-- 글·댓글이 완전히 지워지면 FK가 대상 행만 지우고 공통 행은 대상 없이 남는다. 대상 행이 지워질 때 공통 행도 지운다.
-- 공통 행을 지워서 대상 행이 함께 지워지는 경우에는 이미 없는 행을 지우는 것이라 아무 일도 없다.
CREATE OR REPLACE FUNCTION fn_notification_target_deleted() RETURNS trigger AS $$
BEGIN
    DELETE FROM notification WHERE id = OLD.notification_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_notification_comment_deleted AFTER DELETE ON notification_comment
    FOR EACH ROW EXECUTE FUNCTION fn_notification_target_deleted();
CREATE TRIGGER tg_notification_post_deleted AFTER DELETE ON notification_post
    FOR EACH ROW EXECUTE FUNCTION fn_notification_target_deleted();
CREATE TRIGGER tg_notification_report_deleted AFTER DELETE ON notification_report
    FOR EACH ROW EXECUTE FUNCTION fn_notification_target_deleted();
CREATE TRIGGER tg_notification_case_deleted AFTER DELETE ON notification_case
    FOR EACH ROW EXECUTE FUNCTION fn_notification_target_deleted();

-- 이미 대상 없이 남은 알림 정리 (FOLLOW는 대상 행이 없는 종류다)
DELETE FROM notification n
WHERE n.type <> 'FOLLOW'
  AND NOT EXISTS (SELECT 1 FROM notification_comment x WHERE x.notification_id = n.id)
  AND NOT EXISTS (SELECT 1 FROM notification_post x WHERE x.notification_id = n.id)
  AND NOT EXISTS (SELECT 1 FROM notification_report x WHERE x.notification_id = n.id)
  AND NOT EXISTS (SELECT 1 FROM notification_case x WHERE x.notification_id = n.id);
