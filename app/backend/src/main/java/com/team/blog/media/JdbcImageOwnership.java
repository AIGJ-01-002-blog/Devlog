package com.team.blog.media;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.shared.markdown.ImageOwnership;

/** 본문 사진 키 중 작성자가 올린 사진 리소스만 고른다 (docs/12 S-6, V3 resource). 키 목록은 한 번에 조회한다. */
@Component
class JdbcImageOwnership implements ImageOwnership {
    private final JdbcTemplate jdbc;

    JdbcImageOwnership(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Set<String> ownedBy(long uploaderId, Collection<String> keys) {
        if (keys.isEmpty()) return Set.of();
        return new HashSet<>(jdbc.queryForList(
                "SELECT storage_key FROM resource WHERE uploader_id = ? AND kind = 'IMAGE' AND storage_key = ANY (?)",
                String.class, uploaderId, keys.toArray(String[]::new)));
    }
}
