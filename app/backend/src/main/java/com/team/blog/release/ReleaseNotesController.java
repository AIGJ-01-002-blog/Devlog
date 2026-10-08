package com.team.blog.release;

import java.time.Duration;
import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 릴리스 노트 (054). 누구나 읽는다. 배포 전까지 바뀌지 않으므로 잠깐 캐시한다. */
@RestController
public class ReleaseNotesController {
    private final ReleaseNotes notes;

    public ReleaseNotesController(ReleaseNotes notes) {
        this.notes = notes;
    }

    public record Body(String current, List<ReleaseNotes.Release> releases) {}

    @GetMapping("/api/release-notes")
    public ResponseEntity<Body> list() {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(new Body(notes.currentVersion(), notes.all()));
    }
}
