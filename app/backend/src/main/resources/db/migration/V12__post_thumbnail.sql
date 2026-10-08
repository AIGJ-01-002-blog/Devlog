-- 047 글 썸네일 고르기: 발행할 때 작성자가 목록 대표 사진을 직접 고르거나 없앤다.
-- 행이 없으면 지금처럼 본문 첫 사진(post_image position 0)을 쓴다. 본문에서 계산하는 값은 저장하지 않고(V3),
-- 작성자가 고른 것만 저장한다. 고른 사진이 지워지면 행도 지워져 본문 첫 사진으로 돌아간다.
CREATE TABLE post_thumbnail (
    post_id                bigint NOT NULL,
    resource_id            bigint NULL,
    PRIMARY KEY (post_id),
    CONSTRAINT fk_post_thumbnail_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_thumbnail_resource FOREIGN KEY (resource_id) REFERENCES resource_image (resource_id) ON DELETE CASCADE
);

CREATE INDEX ix_post_thumbnail_resource ON post_thumbnail (resource_id);

COMMENT ON TABLE post_thumbnail IS '작성자가 고른 글 썸네일 (행 없음 = 본문 첫 사진)';
COMMENT ON COLUMN post_thumbnail.post_id IS '글 번호';
COMMENT ON COLUMN post_thumbnail.resource_id IS '고른 사진 (NULL = 썸네일 없음)';
