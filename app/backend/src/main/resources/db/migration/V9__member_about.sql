-- 042 블로그 소개: 회원 한 명당 하나뿐인 긴 소개 글(마크다운). 비어 있으면 행이 없다.
-- 짧은 한 줄 소개(member.bio)와 달리 길고 드물게 읽혀, 자주 읽는 member 행을 넓히지 않도록 1:1 테이블로 둔다.
CREATE TABLE member_about (
    member_id              bigint NOT NULL,
    content_md             text NOT NULL,
    updated_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_id),
    CONSTRAINT fk_member_about_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
    CONSTRAINT ck_member_about_content CHECK (length(btrim(content_md)) > 0 AND char_length(content_md) <= 10000)
);

COMMENT ON TABLE member_about IS '블로그 소개 (회원당 하나, 마크다운)';
COMMENT ON COLUMN member_about.member_id IS '회원 번호';
COMMENT ON COLUMN member_about.content_md IS '소개 원문 (마크다운, 10000자까지)';
COMMENT ON COLUMN member_about.updated_at IS '마지막 수정 일시';
