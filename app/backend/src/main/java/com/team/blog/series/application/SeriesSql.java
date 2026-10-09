package com.team.blog.series.application;

import com.team.blog.post.query.PostFilter;

/** 글 목록에 더하는 시리즈 조건 (series·series_post 테이블은 이 모듈만 안다, 헌법 IV). */
public final class SeriesSql {
    private SeriesSql() {}

    /** 시리즈에 들지 않은 글 (주제 브랜치 계산, 072). 글 별칭 p를 쓰고 자리표시자가 없다 */
    public static final String NOT_IN_SERIES = "NOT EXISTS (SELECT 1 FROM series_post sp WHERE sp.post_id = p.id)";

    /** 한 시리즈의 글만 (홈 브랜치 거르기, 072) */
    public static PostFilter inSeries(long seriesId) {
        return new PostFilter("EXISTS (SELECT 1 FROM series_post sp WHERE sp.post_id = p.id AND sp.series_id = ?)", seriesId);
    }
}
