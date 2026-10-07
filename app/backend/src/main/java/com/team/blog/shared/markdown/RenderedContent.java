package com.team.blog.shared.markdown;

import java.util.List;

/**
 * @param html          정화까지 마친 본문 HTML (content_html)
 * @param excerpt       목록 요약 (코드·이미지·표 제외 글자 앞 200자, docs/10 §2-1)
 * @param imageKeys     본문에 나온 작성자 본인 사진 키 (나온 순서)
 * @param renderVersion 렌더링 규칙 버전
 */
public record RenderedContent(String html, String excerpt, List<String> imageKeys, int renderVersion) {
    public String firstImageKey() {
        return imageKeys.isEmpty() ? null : imageKeys.get(0);
    }
}
