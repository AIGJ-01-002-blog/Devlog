package com.team.blog.shared.markdown;

import java.util.Collection;
import java.util.Map;

/**
 * 본문의 사진 키 중 글 작성자가 올린 것만 골라낸다 (docs/12 S-6). media 모듈이 구현한다.
 * 남이 올린 사진은 링크로 바뀌고 글에 연결되지 않는다.
 */
public interface ImageOwnership {
    /** @return 작성자가 올린 사진 키 → 그 사진의 썸네일 키와 크기 */
    Map<String, OwnedImage> ownedBy(long uploaderId, Collection<String> keys);

    /**
     * @param thumbKey 썸네일 키(없으면 null)
     * @param width    원본 가로(모르면 null). 세로와 함께 있을 때만 쓴다
     * @param height   원본 세로(모르면 null)
     */
    record OwnedImage(String thumbKey, Integer width, Integer height) {
        public boolean hasSize() {
            return width != null && height != null;
        }
    }
}
