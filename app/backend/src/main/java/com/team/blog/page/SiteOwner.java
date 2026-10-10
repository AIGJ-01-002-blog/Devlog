package com.team.blog.page;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 사이트 운영자 블로그 주소 (077). 관리자 승격에 쓰는 실행 설정 `OWNER_HANDLE`과 같은 값이며 비밀값이 아니다.
 * 사이트 소개 화면이 "누가 운영하나요"에 이 블로그를 잇는다. 비어 있으면 문의 화면만 안내한다.
 */
@Component
public class SiteOwner {
    private final String handle;

    public SiteOwner(@Value("${blog.owner.handle:}") String handle) {
        String h = handle == null ? "" : handle.strip();
        if (h.startsWith("@")) h = h.substring(1);
        this.handle = h.toLowerCase();
    }

    public Optional<String> handle() {
        return handle.isEmpty() ? Optional.empty() : Optional.of(handle);
    }
}
