-- 처리된 지 30일 지난 신고 사건은 스냅샷과 그 사건 신고의 설명을 비운다 (019 FR-038, docs/43 H-5).
-- 지금 검사(ck_report_detail)는 "기타" 신고에 설명을 늘 요구해 비울 수 없다. 설명이 있으면 빈 글자가 아니어야 한다는 뜻만 남기고,
-- "기타면 설명 필수"는 접수할 때 앱이 검사한다(비운 뒤에도 사유 OTHER는 남는다).
ALTER TABLE report DROP CONSTRAINT ck_report_detail;
ALTER TABLE report ADD CONSTRAINT ck_report_detail CHECK (detail IS NULL OR length(btrim(detail)) > 0);

-- 숨김 사유는 신고 사유 코드 중 하나다 (docs/43 H-2). 숨기지 않았으면 비어 있다
ALTER TABLE post ADD CONSTRAINT ck_post_hidden_reason CHECK (
    (hidden_at IS NULL AND hidden_reason IS NULL)
    OR (hidden_at IS NOT NULL AND hidden_reason IN ('SPAM', 'ABUSE', 'SEXUAL', 'PRIVACY', 'COPYRIGHT', 'OTHER')));
ALTER TABLE comment ADD CONSTRAINT ck_comment_hidden_reason CHECK (
    (hidden_at IS NULL AND hidden_reason IS NULL)
    OR (hidden_at IS NOT NULL AND hidden_reason IN ('SPAM', 'ABUSE', 'SEXUAL', 'PRIVACY', 'COPYRIGHT', 'OTHER')));
