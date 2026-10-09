package com.team.blog.topic.application;

import java.sql.Array;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.search.semantic.SemanticSearch;
import com.team.blog.series.application.SeriesSql;
import com.team.blog.shared.scheduling.JobLock;
import com.team.blog.tag.application.TagSql;
import com.team.blog.topic.application.TopicClusterer.Doc;
import com.team.blog.topic.application.TopicClusterer.Edge;
import com.team.blog.topic.application.TopicClusterer.Method;
import com.team.blog.topic.application.TopicClusterer.Topic;

/**
 * 주제 브랜치 계산 (072). 간격마다 시리즈에 없는 최근 공개 글을 읽어 태그·임베딩으로 묶고 post_topic을 통째로 바꾼다.
 * 부가 기능이라 실패해도 예전 묶음이 남고 목록·글 읽기는 그대로 된다 (헌법 IV).
 */
@Component
@EnableConfigurationProperties(TopicProperties.class)
public class TopicIndexJob {
    private static final Logger log = LoggerFactory.getLogger(TopicIndexJob.class);

    private final JdbcTemplate jdbc;
    private final SemanticSearch semantic;
    private final TopicProperties props;
    private final JobLock lock;
    private final TransactionTemplate tx;

    public TopicIndexJob(JdbcTemplate jdbc, SemanticSearch semantic, TopicProperties props, JobLock lock,
                         PlatformTransactionManager txManager) {
        this.jdbc = jdbc;
        this.semantic = semantic;
        this.props = props;
        this.lock = lock;
        this.tx = new TransactionTemplate(txManager);
    }

    @Scheduled(fixedDelayString = "${blog.topic.index-interval:10m}", initialDelayString = "${blog.topic.initial-delay:30s}")
    public void scheduled() {
        if (!props.enabled()) return;
        lock.runExclusively("topic-index", props.indexInterval(), () -> {
            try {
                runOnce();
            } catch (RuntimeException e) {
                log.warn("주제 브랜치를 다시 계산하지 못했습니다. 예전 묶음을 그대로 씁니다: {}", e.getMessage());
            }
        });
    }

    /** @return 이번에 만든 브랜치 */
    public List<Topic> runOnce() {
        List<Doc> docs = jdbc.query("SELECT p.id, p.title, " + TagSql.NAMES_COLUMN
                + " FROM post p JOIN member m ON m.id = p.author_id WHERE " + PostAccessPolicy.PUBLIC_LIST_CONDITION
                + " AND " + SeriesSql.NOT_IN_SERIES + " ORDER BY p.first_public_at DESC, p.id DESC LIMIT ?",
                (rs, i) -> new Doc(rs.getLong("id"), rs.getString("title"), tags(rs.getArray("tags"))), props.maxPosts());
        List<Edge> edges = new ArrayList<>(TopicClusterer.tagEdges(docs, props.minTagSimilarity()));
        List<Long> ids = docs.stream().map(Doc::id).toList();
        for (SemanticSearch.Pair p : semantic.similarPairs(ids, props.distanceFactor(), props.neighbors())) {
            edges.add(new Edge(p.a(), p.b(), 1 - p.distance(), Method.EMBEDDING));
        }
        List<Topic> topics = TopicClusterer.cluster(docs, edges, props.maxSize());
        tx.executeWithoutResult(s -> {
            jdbc.update("DELETE FROM post_topic");
            List<Object[]> rows = new ArrayList<>();
            for (Topic t : topics) {
                for (long id : t.members()) rows.add(new Object[] {id, t.key(), t.name(), t.method()});
            }
            if (!rows.isEmpty()) {
                jdbc.batchUpdate("INSERT INTO post_topic (post_id, topic_key, topic_name, method) VALUES (?, ?, ?, ?)", rows);
            }
        });
        log.debug("주제 브랜치 {}개 (글 {}편 중)", topics.size(), docs.size());
        return topics;
    }

    private static List<String> tags(Array array) throws java.sql.SQLException {
        return array == null ? List.of() : List.of((String[]) array.getArray());
    }
}
