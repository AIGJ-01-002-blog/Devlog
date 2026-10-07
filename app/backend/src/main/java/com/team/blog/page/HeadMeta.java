package com.team.blog.page;

import java.time.Instant;

/**
 * 페이지 머리말에 넣을 값 (docs/40 §5). 값은 SpaShell이 이스케이프한다.
 * indexable=false면 검색 엔진 수집을 막는다(noindex).
 */
public record HeadMeta(String title, String description, String canonical, String ogType, String ogImage,
                       Instant publishedTime, Instant modifiedTime, boolean indexable) {

    public static HeadMeta site(String siteName, String description, String canonical, String ogImage) {
        return new HeadMeta(siteName, description, canonical, "website", ogImage, null, null, true);
    }

    /** 볼 수 없는 페이지·로그인 화면 등: 공통 문구 + noindex (docs/06 §3-1). */
    public static HeadMeta privatePage(String siteName, String title) {
        return new HeadMeta(title == null ? siteName : title + " - " + siteName, null, null, null, null, null, null, false);
    }
}
