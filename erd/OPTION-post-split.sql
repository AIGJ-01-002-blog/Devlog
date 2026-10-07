-- 선택안: 이미 3정규형인 post의 수직 분할이며 정규화 작업이 아니다. 팀 합의 전 적용 금지.
-- 장점: 큰 본문·집계 갱신을 뼈대와 분리해 목록 읽기·행 갱신 부담을 조절할 수 있다.
-- 단점: 기존 목록 카드 쿼리에 JOIN 2개 증가; 세 행 생성·수정의 트랜잭션 관리가 필요하다.
-- 05·10·30·31 문서 수정 필요; 숨김 필터용 hidden_*와 공개 목록 인덱스는 post에 유지한다.
-- 빈 스키마의 대체 설계안(member 존재 전제); 기존 V1 위에 실행하는 이관 SQL이 아니다.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE post (
    id                     bigint GENERATED ALWAYS AS IDENTITY,
    author_id              bigint NOT NULL,
    title                  varchar(100) NOT NULL DEFAULT '',
    status                 varchar(20) NOT NULL DEFAULT 'DRAFT',
    visibility             varchar(20) NOT NULL DEFAULT 'PUBLIC',
    published_at           timestamptz NULL,
    first_public_at        timestamptz NULL,
    edited_at              timestamptz NULL,
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at             timestamptz NULL,
    hidden_at              timestamptz NULL,
    hidden_by              bigint NULL,
    hidden_reason          varchar(30) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_post_author FOREIGN KEY (author_id) REFERENCES member (id) ON DELETE RESTRICT,
    CONSTRAINT ck_post_status CHECK (status IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT ck_post_visibility CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
    CONSTRAINT ck_post_published CHECK (status = 'DRAFT' OR (published_at IS NOT NULL AND length(btrim(title)) > 0)),
    CONSTRAINT ck_post_public_at CHECK (NOT (status = 'PUBLISHED' AND visibility = 'PUBLIC') OR first_public_at IS NOT NULL),
    CONSTRAINT ck_post_edited_at CHECK (edited_at IS NULL OR (published_at IS NOT NULL AND edited_at >= published_at)),
    CONSTRAINT fk_post_hidden_by FOREIGN KEY (hidden_by) REFERENCES member (id) ON DELETE RESTRICT
);

CREATE INDEX ix_post_feed ON post (first_public_at DESC, id DESC) WHERE status = 'PUBLISHED' AND visibility = 'PUBLIC' AND deleted_at IS NULL AND hidden_at IS NULL;

CREATE INDEX ix_post_blog ON post (author_id, first_public_at DESC, id DESC) WHERE status = 'PUBLISHED' AND visibility = 'PUBLIC' AND deleted_at IS NULL AND hidden_at IS NULL;

CREATE INDEX ix_post_manage ON post (author_id, status, updated_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX ix_post_trash ON post (author_id, deleted_at DESC) WHERE deleted_at IS NOT NULL;

CREATE INDEX ix_post_title_trgm ON post USING gin (title gin_trgm_ops);

COMMENT ON TABLE post IS '글';

COMMENT ON COLUMN post.id IS '글 번호';

COMMENT ON COLUMN post.author_id IS '작성자 번호';

COMMENT ON COLUMN post.title IS '제목';

COMMENT ON COLUMN post.status IS '상태';

COMMENT ON COLUMN post.visibility IS '공개 범위';

COMMENT ON COLUMN post.published_at IS '최초 발행 시각';

COMMENT ON COLUMN post.first_public_at IS '최초 공개 시각';

COMMENT ON COLUMN post.edited_at IS '수정 발행 시각';

COMMENT ON COLUMN post.created_at IS '생성 시각';

COMMENT ON COLUMN post.updated_at IS '갱신 시각';

COMMENT ON COLUMN post.deleted_at IS '삭제 시각';

COMMENT ON COLUMN post.hidden_at IS '숨김 시각';

COMMENT ON COLUMN post.hidden_by IS '숨긴 관리자 번호';

COMMENT ON COLUMN post.hidden_reason IS '숨김 사유';

CREATE TABLE post_content (
    post_id                bigint NOT NULL,
    content_md             text NOT NULL DEFAULT '',
    content_html           text NOT NULL DEFAULT '',
    excerpt                varchar(200) NULL,
    thumbnail_url          varchar(500) NULL,
    edit_version           bigint NOT NULL DEFAULT 0,
    render_version         integer NOT NULL DEFAULT 1,
    PRIMARY KEY (post_id),
    CONSTRAINT fk_post_content_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE,
    CONSTRAINT ck_post_content_length CHECK (char_length(content_md) <= 100000)
);

CREATE INDEX ix_post_content_trgm ON post_content USING gin (content_md gin_trgm_ops);

COMMENT ON TABLE post_content IS '글 본문';

COMMENT ON COLUMN post_content.post_id IS '글 번호';

COMMENT ON COLUMN post_content.content_md IS '마크다운 원문';

COMMENT ON COLUMN post_content.content_html IS '렌더링 본문';

COMMENT ON COLUMN post_content.excerpt IS '목록 미리보기';

COMMENT ON COLUMN post_content.thumbnail_url IS '썸네일 주소';

COMMENT ON COLUMN post_content.edit_version IS '편집 버전';

COMMENT ON COLUMN post_content.render_version IS '렌더링 버전';

CREATE TABLE post_stat (
    post_id                bigint NOT NULL,
    view_count             bigint NOT NULL DEFAULT 0,
    like_count             integer NOT NULL DEFAULT 0,
    comment_count          integer NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id),
    CONSTRAINT fk_post_stat_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE,
    CONSTRAINT ck_post_stat_counts CHECK (view_count >= 0 AND like_count >= 0 AND comment_count >= 0)
);

COMMENT ON TABLE post_stat IS '글 통계';

COMMENT ON COLUMN post_stat.post_id IS '글 번호';

COMMENT ON COLUMN post_stat.view_count IS '조회 수';

COMMENT ON COLUMN post_stat.like_count IS '좋아요 수';

COMMENT ON COLUMN post_stat.comment_count IS '댓글 수';
