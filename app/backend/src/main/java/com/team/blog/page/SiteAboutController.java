package com.team.blog.page;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 사이트 소개 화면 데이터 (077). 화면 안에서 옮겨 와 서버가 첫 화면 데이터를 넣지 못했을 때 React가 읽는다. */
@RestController
public class SiteAboutController {
    private final SiteOwner owner;

    public SiteAboutController(SiteOwner owner) {
        this.owner = owner;
    }

    public record SiteAbout(String ownerHandle) {}

    @GetMapping("/api/site/about")
    public SiteAbout about() {
        return new SiteAbout(owner.handle().orElse(null));
    }
}
