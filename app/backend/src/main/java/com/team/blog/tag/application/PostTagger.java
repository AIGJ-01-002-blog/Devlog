package com.team.blog.tag.application;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.team.blog.post.application.PublishCommand;
import com.team.blog.post.application.PublishExtension;
import com.team.blog.post.domain.Post;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.error.FieldErrorItem;
import com.team.blog.shared.markdown.RenderedContent;

/**
 * 발행할 때 글의 태그를 통째로 바꾼다 (docs/22 §2-2·§4, spec 010 FR-009~FR-013). 검사는 트랜잭션 밖 validate에서 끝내고,
 * 문제가 있는 태그를 모두 tags[i] 위치와 함께 돌려준다. 태그 행은 지우지 않는다.
 * 발행 권한은 발행 서비스가 이미 확인했다(본인 글만 잠근다, FR-016).
 */
@Component
class PostTagger implements PublishExtension {
    /** 화면을 거치지 않은 요청이 태그를 수천 개 보내도 검사 비용이 커지지 않게 받는 개수를 먼저 자른다. */
    private static final int MAX_INPUT = 100;

    private final JdbcTemplate jdbc;
    private final TagNormalizer normalizer;
    private final int maxTags;

    PostTagger(JdbcTemplate jdbc, TagNormalizer normalizer, BlogProperties props) {
        this.jdbc = jdbc;
        this.normalizer = normalizer;
        this.maxTags = props.post().maxTags();
    }

    @Override
    public void validate(PublishCommand command, List<FieldErrorItem> errors) {
        List<String> raw = command.tags();
        if (raw.size() > MAX_INPUT) {
            errors.add(tooMany());
            return;
        }
        Set<String> distinct = new LinkedHashSet<>();
        for (int i = 0; i < raw.size(); i++) {
            TagNormalizer.Verdict v = normalizer.check(raw.get(i));
            if (!v.ok()) errors.add(new FieldErrorItem("tags[" + i + "]", v.code().name(), v.code().message()));
            if (!v.name().isEmpty()) distinct.add(v.name());
        }
        if (distinct.size() > maxTags) errors.add(tooMany());
    }

    @Override
    public void onPublish(Post post, RenderedContent rendered, PublishCommand command) {
        String[] names = names(command.tags()).toArray(String[]::new);
        jdbc.update("DELETE FROM post_tag WHERE post_id = ?", post.getId());
        if (names.length == 0) return;
        // 같은 새 태그로 동시에 발행해도 행은 하나다. 이름 순으로 넣어 겹치는 태그를 가진 발행끼리 교착하지 않게 한다
        jdbc.update("INSERT INTO tag (name) SELECT n FROM unnest(?::varchar[]) AS n ORDER BY n ON CONFLICT (name) DO NOTHING",
                (Object) names);
        jdbc.update("""
                INSERT INTO post_tag (post_id, tag_id, position)
                SELECT ?, t.id, (k.ord - 1)::smallint
                FROM unnest(?::varchar[]) WITH ORDINALITY AS k(name, ord)
                JOIN tag t ON t.name = k.name
                """, post.getId(), names);
    }

    /** 정규화 뒤 처음 나온 것만 입력 순서대로 (validate를 통과한 입력이다). */
    List<String> names(List<String> raw) {
        Set<String> out = new LinkedHashSet<>();
        for (String r : raw) out.add(TagNormalizer.clean(r));
        return new ArrayList<>(out);
    }

    private FieldErrorItem tooMany() {
        return new FieldErrorItem("tags", "TOO_MANY_TAGS", "태그는 " + maxTags + "개까지 달 수 있어요.");
    }
}
