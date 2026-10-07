-- 친구에게만 공개(FRIENDS) 켜기 (docs/06 §6-1, 2026-10-07 민서 결정 "넣기").
-- 공통 테이블은 CHECK 교체와 인덱스 추가만 한다. 친구 관계(friendship)는 V1에 이미 있다.
ALTER TABLE post   DROP CONSTRAINT ck_post_visibility;
ALTER TABLE post   ADD  CONSTRAINT ck_post_visibility CHECK (visibility IN ('PUBLIC', 'FRIENDS', 'PRIVATE'));
ALTER TABLE member DROP CONSTRAINT ck_member_default_visibility;
ALTER TABLE member ADD  CONSTRAINT ck_member_default_visibility
    CHECK (default_visibility IN ('PUBLIC', 'FRIENDS', 'PRIVATE'));

COMMENT ON COLUMN post.visibility IS '공개 범위: PUBLIC 전체 공개 / FRIENDS 친구에게만 / PRIVATE 나만 보기';
COMMENT ON COLUMN member.default_visibility IS '새 글 기본 공개 범위: PUBLIC / FRIENDS / PRIVATE';

-- 친구가 보는 블로그 목록 (PUBLIC + FRIENDS). 친구 공개 글은 first_public_at이 없어 published_at으로 정렬한다 (§6-3).
CREATE INDEX ix_post_blog_friends ON post (author_id, published_at DESC, id DESC)
    WHERE status = 'PUBLISHED' AND visibility IN ('PUBLIC', 'FRIENDS') AND deleted_at IS NULL AND hidden_at IS NULL;
