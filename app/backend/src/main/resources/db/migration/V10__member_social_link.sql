-- 043 블로그 소셜 정보: 블로그 머리에 보이는 이메일·GitHub·X·Facebook·홈페이지 (velog 프로필의 소셜 정보).
-- 종류마다 칸을 두지 않고 (회원, 종류)당 한 행으로 둔다. 비어 있는 종류는 행이 없다.
-- 값은 정리한 형태로 둔다: 이메일은 소문자 주소, GitHub·X·Facebook은 아이디만, 홈페이지는 http(s) 주소.
CREATE TABLE member_social_link (
    member_id              bigint NOT NULL,
    kind                   varchar(20) NOT NULL,
    value                  varchar(254) NOT NULL,
    PRIMARY KEY (member_id, kind),
    CONSTRAINT fk_member_social_link_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
    CONSTRAINT ck_member_social_link_kind CHECK (kind IN ('EMAIL', 'GITHUB', 'X', 'FACEBOOK', 'HOMEPAGE')),
    CONSTRAINT ck_member_social_link_value CHECK (char_length(value) > 0)
);

COMMENT ON TABLE member_social_link IS '블로그 소셜 정보 (회원·종류당 하나)';
COMMENT ON COLUMN member_social_link.member_id IS '회원 번호';
COMMENT ON COLUMN member_social_link.kind IS '종류 (EMAIL, GITHUB, X, FACEBOOK, HOMEPAGE)';
COMMENT ON COLUMN member_social_link.value IS '정리한 값 (이메일 주소, 아이디, 홈페이지 주소)';
