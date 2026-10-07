-- 024 시리즈: 회원의 글 묶음과 묶음 안 순서 (FR-001·FR-002)
CREATE TABLE series (
    id                     bigint GENERATED ALWAYS AS IDENTITY,
    member_id              bigint NOT NULL,
    name                   varchar(50) NOT NULL,
    slug                   varchar(80) NOT NULL,
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_series_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
    CONSTRAINT uq_series_slug UNIQUE (member_id, slug),
    CONSTRAINT ck_series_name CHECK (length(btrim(name)) > 0),
    CONSTRAINT ck_series_slug CHECK (length(slug) > 0)
);

-- 글 하나는 시리즈 하나에만 (post_id 기본 키). 순서 바꾸기 중 겹침을 허용하려고 위치 고유 제약은 커밋 때 확인한다
CREATE TABLE series_post (
    post_id                bigint NOT NULL,
    series_id              bigint NOT NULL,
    position               integer NOT NULL,
    PRIMARY KEY (post_id),
    CONSTRAINT fk_series_post_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE,
    CONSTRAINT fk_series_post_series FOREIGN KEY (series_id) REFERENCES series (id) ON DELETE CASCADE,
    CONSTRAINT uq_series_post_position UNIQUE (series_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT ck_series_post_position CHECK (position >= 0)
);

COMMENT ON TABLE series IS '시리즈 (회원의 글 묶음)';
COMMENT ON COLUMN series.id IS '시리즈 번호';
COMMENT ON COLUMN series.member_id IS '만든 회원 번호';
COMMENT ON COLUMN series.name IS '시리즈 이름';
COMMENT ON COLUMN series.slug IS '주소에 쓰는 이름 (회원 안에서 고유)';
COMMENT ON COLUMN series.created_at IS '생성 일시';
COMMENT ON COLUMN series.updated_at IS '이름·구성 변경 일시';
COMMENT ON TABLE series_post IS '시리즈에 든 글과 순서';
COMMENT ON COLUMN series_post.post_id IS '글 번호';
COMMENT ON COLUMN series_post.series_id IS '시리즈 번호';
COMMENT ON COLUMN series_post.position IS '시리즈 안 순서 (0부터)';
