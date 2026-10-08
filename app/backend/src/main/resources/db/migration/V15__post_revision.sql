-- 054 글 수정 이력: 발행·다시 발행할 때마다 발행본을 한 판씩 남긴다. 작성자만 보고, 이전 판을 편집기로 불러와 되돌린다.
-- 글을 완전히 지우면 함께 지워진다(ON DELETE CASCADE). 글마다 최근 50판만 둔다(오래된 판은 발행할 때 앱이 지운다).
CREATE TABLE post_revision (
    post_id                bigint NOT NULL,
    revision_no            integer NOT NULL,
    title                  varchar(100) NOT NULL,
    content_md             text NOT NULL,
    summary                varchar(150) NULL,
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, revision_no),
    CONSTRAINT fk_post_revision_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE,
    CONSTRAINT ck_post_revision_no CHECK (revision_no > 0)
);

COMMENT ON TABLE post_revision IS '글 수정 이력 (발행할 때마다 발행본 한 판)';
COMMENT ON COLUMN post_revision.post_id IS '글 번호';
COMMENT ON COLUMN post_revision.revision_no IS '판 번호 (글마다 1부터)';
COMMENT ON COLUMN post_revision.title IS '그때 발행한 제목';
COMMENT ON COLUMN post_revision.content_md IS '그때 발행한 본문 (Markdown 원본)';
COMMENT ON COLUMN post_revision.summary IS '그때 발행한 소개 (NULL = 본문 앞부분으로 요약)';
COMMENT ON COLUMN post_revision.created_at IS '발행 일시';

-- 이미 발행한 글은 지금 발행본을 첫 판으로 남겨, 다음에 고쳐도 비교할 기준이 있게 한다
INSERT INTO post_revision (post_id, revision_no, title, content_md, summary, created_at)
SELECT id, 1, title, content_md, summary, COALESCE(edited_at, published_at, updated_at)
FROM post
WHERE status = 'PUBLISHED' AND deleted_at IS NULL;
