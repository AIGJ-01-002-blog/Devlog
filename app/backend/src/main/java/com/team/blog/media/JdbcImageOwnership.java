package com.team.blog.media;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

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
    public Map<String, String> ownedBy(long uploaderId, Collection<String> keys) {
        Map<String, String> owned = new HashMap<>();
        if (keys.isEmpty()) return owned;
        jdbc.query("""
                SELECT r.storage_key, ri.thumb_storage_key FROM resource r
                LEFT JOIN resource_image ri ON ri.resource_id = r.id
                WHERE r.uploader_id = ? AND r.kind = 'IMAGE' AND r.storage_key = ANY (?)
                """, rs -> {
            owned.put(rs.getString(1), rs.getString(2));
        }, uploaderId, keys.toArray(String[]::new));
        return owned;
    }
}
