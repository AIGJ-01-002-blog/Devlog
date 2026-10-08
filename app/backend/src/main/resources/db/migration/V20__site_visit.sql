-- 사이트 방문자 (spec 064). 하루에 방문자 한 명당 한 행. 방문자 값은 회원 번호·방문자 쿠키·IP를 해시한 32자라 원래 값을 되돌릴 수 없다.
-- visits는 그날 들어온 횟수(30분 넘게 쉬었다 다시 오면 한 번 더). 400일이 지나면 지운다.
CREATE TABLE site_visit (
    day      date        NOT NULL,
    visitor  char(32)    NOT NULL,
    member   boolean     NOT NULL,
    visits   integer     NOT NULL DEFAULT 1 CHECK (visits > 0),
    first_at timestamptz NOT NULL,
    last_at  timestamptz NOT NULL,
    PRIMARY KEY (day, visitor)
);
