-- 045 글 짧은 소개: 발행할 때 작성자가 직접 쓴 목록용 소개(150자). 비워 두면 NULL이고 목록은 본문 앞부분으로 요약을 계산한다.
-- 본문에서 계산하는 값(V3에서 지운 excerpt)과 달리 작성자가 입력한 값이라 저장한다. 글 하나에 하나뿐이고 짧아 post 열로 둔다.
ALTER TABLE post ADD COLUMN summary varchar(150) NULL;
ALTER TABLE post ADD CONSTRAINT ck_post_summary CHECK (summary IS NULL OR length(btrim(summary)) > 0);

COMMENT ON COLUMN post.summary IS '작성자가 쓴 짧은 소개 (150자까지, NULL = 본문 앞부분으로 자동 요약)';
