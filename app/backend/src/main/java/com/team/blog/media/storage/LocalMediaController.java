package com.team.blog.media.storage;

import java.util.concurrent.TimeUnit;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** 로컬 저장소일 때만 사진을 내려준다. S3 저장소면 저장소가 비어 있다고 답해 404가 된다. */
@RestController
class LocalMediaController {
    private final ObjectStorage storage;

    LocalMediaController(ObjectStorage storage) {
        this.storage = storage;
    }

    @GetMapping("/media/{*key}")
    ResponseEntity<byte[]> get(@PathVariable String key) {
        String k = key.startsWith("/") ? key.substring(1) : key;
        if (k.isEmpty() || k.contains("..")) return ResponseEntity.notFound().build();
        return storage.get(k)
                .map(o -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(o.contentType()))
                        .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                        .header("X-Content-Type-Options", "nosniff")
                        .body(o.data()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
