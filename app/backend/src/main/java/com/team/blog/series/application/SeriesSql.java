package com.team.blog.series.application;

import com.team.blog.post.query.PostFilter;

/** 글 목록에 더하는 시리즈 조건 (series·series_post 테이블은 이 모듈만 안다, 헌법 IV). */
public final class SeriesSql {
    private SeriesSql() {}

    /** 시리즈에 들지 않은 글 (주제 브랜치 계산, 072). 글 별칭 p를 쓰고 자리표시자가 없다 */
    public static final String NOT_IN_SERIES = "NOT EXISTS (SELECT 1 FROM series_post sp WHERE sp.post_id = p.id)";

    /**
     * 글이 든 시리즈를 구독한 회원 번호 (새 글 알림, 072). 자리표시자 하나(글 번호)
     */
    public static final String SUBSCRIBERS_OF_POST =
            "SELECT ss.member_id FROM series_subscription ss JOIN series_post sp ON sp.series_id = ss.series_id WHERE sp.post_id = ?";

    /** 글(자리표시자 하나, 글 번호)과 같은 시리즈의 글 p (비슷한 글에서 뺀다, 072) */
    public static final String SAME_SERIES_AS =
            "EXISTS (SELECT 1 FROM series_post a JOIN series_post b ON b.series_id = a.series_id WHERE a.post_id = ? AND b.post_id = p.id)";

    /** 한 시리즈의 글만 (홈 브랜치 거르기, 072) */
    public static PostFilter inSeries(long seriesId) {
        return new PostFilter("EXISTS (SELECT 1 FROM series_post sp WHERE sp.post_id = p.id AND sp.series_id = ?)", seriesId);
    }
}
