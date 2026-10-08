-- 날짜별 활동한 회원 (spec 066). 로그인한 채로 블로그를 쓴 날마다 회원당 한 행. 관리자 대시보드의 "활동한 회원" 그래프가 센다.
-- 400일이 지나면 지운다. 회원이 완전히 지워지면 함께 지운다.
CREATE TABLE member_active_day (
    member_id bigint NOT NULL REFERENCES member (id) ON DELETE CASCADE,
    day       date   NOT NULL,
    PRIMARY KEY (day, member_id)
);

-- 지금까지는 마지막 활동 시각만 있었으므로 그 날짜 하루를 채워 둔다
INSERT INTO member_active_day (member_id, day)
SELECT id, (last_active_at AT TIME ZONE 'Asia/Seoul')::date FROM member
WHERE last_active_at IS NOT NULL AND deleted_at IS NULL
ON CONFLICT DO NOTHING;
