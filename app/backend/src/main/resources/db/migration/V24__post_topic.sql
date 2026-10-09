-- 주제 브랜치 (spec 072). 시리즈에 없는 공개 글 중 내용이 비슷한 글끼리 서버가 주기적으로 묶은 결과.
-- 매번 통째로 다시 계산해 바꿔 넣는다. 묶음 번호는 묶음에서 가장 작은 글 번호라 다시 계산해도 같은 묶음은 같은 번호다.
CREATE TABLE post_topic (
    post_id                bigint NOT NULL,
    topic_key              bigint NOT NULL,
    topic_name             varchar(60) NOT NULL,
    method                 varchar(10) NOT NULL,
    computed_at            timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id),
    CONSTRAINT fk_post_topic_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE,
    CONSTRAINT ck_post_topic_method CHECK (method IN ('EMBEDDING', 'TAG', 'MIXED')),
    CONSTRAINT ck_post_topic_name CHECK (length(btrim(topic_name)) > 0)
);
CREATE INDEX ix_post_topic_key ON post_topic (topic_key);

COMMENT ON TABLE post_topic IS '주제 브랜치: 내용이 비슷해 자동으로 묶인 글';
COMMENT ON COLUMN post_topic.post_id IS '글 번호';
COMMENT ON COLUMN post_topic.topic_key IS '묶음 번호 (묶음에서 가장 작은 글 번호)';
COMMENT ON COLUMN post_topic.topic_name IS '묶음 이름 (가장 많이 쓰인 태그, 없으면 가장 오래된 글 제목 앞부분)';
COMMENT ON COLUMN post_topic.method IS '묶은 근거 (EMBEDDING 임베딩만, TAG 태그만, MIXED 둘 다)';
COMMENT ON COLUMN post_topic.computed_at IS '계산한 일시';
