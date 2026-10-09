-- 시리즈 새 글 알림 (spec 072 2단계). 회원이 구독한 시리즈에 새 글이 처음 공개되면 알림(새 글)을 받는다.
CREATE TABLE series_subscription (
    member_id              bigint NOT NULL,
    series_id              bigint NOT NULL,
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_id, series_id),
    CONSTRAINT fk_series_subscription_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
    CONSTRAINT fk_series_subscription_series FOREIGN KEY (series_id) REFERENCES series (id) ON DELETE CASCADE
);
CREATE INDEX ix_series_subscription_series ON series_subscription (series_id);

COMMENT ON TABLE series_subscription IS '시리즈 구독 (새 글 알림)';
COMMENT ON COLUMN series_subscription.member_id IS '구독한 회원 번호';
COMMENT ON COLUMN series_subscription.series_id IS '시리즈 번호';
COMMENT ON COLUMN series_subscription.created_at IS '구독한 일시';

-- 발행 창 [묶지 않기] (spec 072 2단계). 작성자가 고른 글은 주제 브랜치로 자동으로 묶지 않는다.
CREATE TABLE post_topic_optout (
    post_id                bigint NOT NULL,
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id),
    CONSTRAINT fk_post_topic_optout_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE
);

COMMENT ON TABLE post_topic_optout IS '주제 브랜치로 묶지 않을 글 (작성자가 고름)';
COMMENT ON COLUMN post_topic_optout.post_id IS '글 번호';
COMMENT ON COLUMN post_topic_optout.created_at IS '고른 일시';
