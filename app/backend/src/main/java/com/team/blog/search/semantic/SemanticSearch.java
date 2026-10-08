package com.team.blog.search.semantic;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.search.semantic.EmbeddingClient.EmbedException;
import com.team.blog.search.semantic.EmbeddingClient.Purpose;

/**
 * 하이브리드 검색의 의미 검색 쪽 (spec 054). 검색어를 임베딩해 pgvector에서 가까운 공개 글을 찾는다.
 * <p>
 * 의미 검색은 덤이다. 공급자가 설정되지 않았거나, pgvector 표가 없거나(확장 권한 없는 공용 DB), 공급자가 응답하지 않으면
 * 빈 값을 돌려주고 검색은 키워드만으로 끝난다. 공급자 연결에 실패하면 downFor 동안 다시 부르지 않아 검색이 느려지지 않는다.
 * 검색어 벡터는 Redis에 보관해 같은 검색어는 공급자를 다시 부르지 않는다. 검색어 원문은 열쇠에 넣지 않는다(해시).
 */
@Service
@EnableConfigurationProperties(SemanticProperties.class)
public class SemanticSearch {
    private static final Logger log = LoggerFactory.getLogger(SemanticSearch.class);
    static final String DOWN = "search:embed:down";
    static final String QUERY_CACHE = "search:qvec:";

    private final JdbcTemplate jdbc;
    private final StringRedisTemplate redis;
    private final EmbeddingClient client;
    private final SemanticProperties props;
    private volatile Boolean tableReady;

    public SemanticSearch(JdbcTemplate jdbc, StringRedisTemplate redis, EmbeddingClient client, SemanticProperties props) {
        this.jdbc = jdbc;
        this.redis = redis;
        this.client = client;
        this.props = props;
    }

    /** 의미 검색을 쓸 수 있게 설정돼 있는지 (공급자가 지금 켜져 있는지는 보지 않는다) */
    public boolean enabled() {
        return client.configured() && tableReady();
    }

    boolean tableReady() {
        Boolean ready = tableReady;
        if (ready == null) {
            try {
                ready = Boolean.TRUE.equals(jdbc.queryForObject("SELECT to_regclass('post_embedding') IS NOT NULL", Boolean.class));
            } catch (RuntimeException e) {
                ready = false;
            }
            if (!ready) log.info("post_embedding 표가 없어(pgvector 없음) 검색은 키워드만 씁니다");
            tableReady = ready;
        }
        return ready;
    }

    /**
     * @param authorId 블로그 안 검색이면 그 블로그 주인
     * @return 가까운 순서의 공개 글 번호. 쓸 수 없으면 비어 있다
     */
    public Optional<List<Long>> nearest(String query, Long authorId) {
        if (!enabled()) return Optional.empty();
        Optional<String> vector = queryVector(query);
        if (vector.isEmpty()) return Optional.empty();
        List<Object> args = new ArrayList<>();
        args.add(vector.get());
        args.add(client.model());
        StringBuilder sql = new StringBuilder("""
                SELECT p.id FROM (
                    SELECT e.post_id, e.embedding <=> ?::vector AS distance FROM post_embedding e WHERE e.model = ?
                ) d
                JOIN post p ON p.id = d.post_id JOIN member m ON m.id = p.author_id
                WHERE\s""").append(PostAccessPolicy.PUBLIC_LIST_CONDITION).append(" AND d.distance <= ?");
        args.add(client.maxDistance());
        if (authorId != null) {
            sql.append(" AND p.author_id = ?");
            args.add(authorId);
        }
        sql.append(" ORDER BY d.distance, p.id DESC LIMIT ?");
        args.add(props.candidates());
        try {
            return Optional.of(jdbc.queryForList(sql.toString(), Long.class, args.toArray()));
        } catch (RuntimeException e) {
            // 벡터 차원이 다른 행이 섞이는 등 DB 쪽 오류도 검색을 막지 않는다
            log.warn("의미 검색을 건너뜁니다: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<String> queryVector(String query) {
        String key = QUERY_CACHE + client.model() + ":" + hash(query);
        try {
            String cached = redis.opsForValue().get(key);
            if (cached != null) return Optional.of(cached);
            if (Boolean.TRUE.equals(redis.hasKey(DOWN))) return Optional.empty();
        } catch (RuntimeException e) {
            return Optional.empty();
        }
        try {
            String v = EmbeddingClient.literal(client.embed(List.of(query), Purpose.QUERY, props.queryTimeout()).get(0));
            try {
                redis.opsForValue().set(key, v, props.queryCacheTtl());
            } catch (RuntimeException ignored) {
                // 보관하지 못해도 이번 검색에는 쓴다
            }
            return Optional.of(v);
        } catch (EmbedException e) {
            markDown(e);
            return Optional.empty();
        }
    }

    void markDown(EmbedException e) {
        log.warn("임베딩 공급자를 {} 동안 건너뜁니다: {}", props.downFor(), e.getMessage());
        try {
            redis.opsForValue().set(DOWN, "1", props.downFor());
        } catch (RuntimeException ignored) {
            // Redis가 없으면 다음 검색이 다시 시도한다
        }
    }

    boolean down() {
        try {
            return Boolean.TRUE.equals(redis.hasKey(DOWN));
        } catch (RuntimeException e) {
            return true;
        }
    }

    static String hash(String query) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(query.strip().toLowerCase().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d, 0, 16);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
