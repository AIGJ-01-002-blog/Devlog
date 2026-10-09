package com.team.blog.topic;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.team.blog.topic.application.TopicClusterer;
import com.team.blog.topic.application.TopicClusterer.Doc;
import com.team.blog.topic.application.TopicClusterer.Edge;
import com.team.blog.topic.application.TopicClusterer.Method;
import com.team.blog.topic.application.TopicClusterer.Topic;

/** spec 072 주제 브랜치 묶기 규칙 (DB 없이). */
class TopicClustererTest {
    static Doc doc(long id, String... tags) {
        return new Doc(id, "글 " + id, List.of(tags));
    }

    @Test
    void 드문_태그가_겹치는_글끼리_묶이고_번호는_가장_작은_글_번호다() {
        List<Doc> docs = List.of(doc(5, "spring", "pg_trgm", "검색"), doc(3, "spring", "pg_trgm", "검색"), doc(9, "spring", "css"),
                doc(11, "spring", "redis"));
        List<Topic> topics = TopicClusterer.cluster(docs, TopicClusterer.tagEdges(docs, 0.5), 12);
        assertThat(topics).hasSize(1);
        assertThat(topics.get(0).key()).isEqualTo(3);
        assertThat(topics.get(0).members()).containsExactly(3L, 5L);
        assertThat(topics.get(0).method()).isEqualTo("TAG");
        // 둘 다 같은 수로 쓰였으면 가나다순 앞
        assertThat(topics.get(0).name()).isEqualTo("pg_trgm");
    }

    @Test
    void 모두가_쓰는_태그_하나만_겹쳐서는_묶이지_않는다() {
        List<Doc> docs = List.of(doc(1, "spring"), doc(2, "spring"), doc(3, "spring"));
        assertThat(TopicClusterer.tagEdges(docs, 0.5)).isEmpty();
    }

    @Test
    void 한_브랜치는_최대_크기를_넘지_않는다() {
        List<Doc> docs = new ArrayList<>();
        List<Edge> edges = new ArrayList<>();
        for (long i = 1; i <= 10; i++) {
            docs.add(doc(i));
            if (i > 1) edges.add(new Edge(i - 1, i, 0.9, Method.EMBEDDING));
        }
        List<Topic> topics = TopicClusterer.cluster(docs, edges, 4);
        assertThat(topics).allSatisfy(t -> assertThat(t.members()).hasSizeLessThanOrEqualTo(4));
        assertThat(topics.stream().mapToInt(t -> t.members().size()).sum()).isGreaterThanOrEqualTo(8);
    }

    @Test
    void 태그가_없으면_가장_오래된_글_제목으로_이름을_짓고_근거가_섞이면_MIXED() {
        List<Doc> docs = List.of(new Doc(7, "아주 긴 제목이 들어간 글입니다 브랜치 이름은 앞부분만 씁니다", List.of()),
                new Doc(8, "다른 글", List.of("x")), new Doc(9, "세 번째", List.of("x")), doc(10, "y"), doc(11, "z"));
        List<Edge> edges = List.of(new Edge(7, 8, 0.8, Method.EMBEDDING), new Edge(8, 9, 0.7, Method.TAG));
        Topic t = TopicClusterer.cluster(docs, edges, 12).get(0);
        assertThat(t.method()).isEqualTo("MIXED");
        assertThat(t.name()).isEqualTo("x");

        Topic only = TopicClusterer.cluster(docs.subList(0, 2), List.of(edges.get(0)), 12).get(0);
        assertThat(only.name()).startsWith("아주 긴 제목").endsWith("…");
        assertThat(only.name().codePointCount(0, only.name().length())).isLessThanOrEqualTo(31);
    }

    @Test
    void 같은_입력이면_매번_같은_결과다() {
        List<Doc> docs = List.of(doc(1, "a", "b"), doc(2, "a", "b"), doc(3, "a", "b"), doc(4, "c"));
        List<Topic> first = TopicClusterer.cluster(docs, TopicClusterer.tagEdges(docs, 0.5), 2);
        List<Topic> second = TopicClusterer.cluster(docs, TopicClusterer.tagEdges(docs, 0.5), 2);
        assertThat(first).isEqualTo(second);
    }

    @Test
    void 거의_모든_글이_쓰는_태그는_이름이_되지_않고_겹치는_이름은_큰_브랜치가_먼저_갖는다() {
        List<Doc> docs = new ArrayList<>();
        for (long i = 1; i <= 5; i++) docs.add(doc(i, "devlog", "포트폴리오", "redis"));
        for (long i = 6; i <= 10; i++) docs.add(doc(i, "devlog", "포트폴리오", "t" + i));
        List<Edge> edges = List.of(new Edge(1, 2, 0.9, Method.EMBEDDING), new Edge(2, 3, 0.9, Method.EMBEDDING),
                new Edge(4, 5, 0.9, Method.EMBEDDING));
        List<Topic> topics = TopicClusterer.cluster(docs, edges, 12);
        assertThat(topics).extracting(Topic::key).containsExactly(1L, 4L);
        // devlog·포트폴리오는 모든 글에 붙어 있어 건너뛰고, redis는 큰 브랜치가 가져간다
        assertThat(topics.get(0).name()).isEqualTo("redis");
        assertThat(topics.get(1).name()).isEqualTo("글 4");
    }
}
