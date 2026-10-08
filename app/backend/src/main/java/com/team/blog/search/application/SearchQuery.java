package com.team.blog.search.application;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.account.domain.Visibility;
import com.team.blog.discovery.application.FeedQuery.Author;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.post.infra.PostSql;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.cursor.CursorCodec;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.markdown.ContentRenderer;
import com.team.blog.shared.markdown.ImageUrls;
import com.team.blog.shared.text.BioText;
import com.team.blog.shared.time.Times;

/**
 * 글·사람 검색 (spec 014, docs/33). 글 검색은 홈 목록과 같은 공용 공개 조건만 쓰므로 친구 공개·비공개·휴지통·숨김·
 * 탈퇴 신청 작성자의 글은 나오지 않는다(FR-002). 점수는 매기지 않고 단계(제목 → 제목·태그 → 본문) 안에서 최신순이다.
 * <p>
 * 단계마다 ① 최근 공개 글 N개(설정 recent-window) 안에서 먼저 찾고, ② 모자라면 가장 긴 단어로 제목·태그·본문 후보를
 * 각각 인덱스로 모아(UNION) 전체 조건을 확인한다. 태그 EXISTS를 OR로 섞으면 본문 인덱스를 못 쓴다 (docs/33 §4·§8).
 * 찾은 번호로 카드(글 + 작성자 + 수)를 한 번에 읽는다.
 */
@Service
public class SearchQuery {
    public enum Sort { RELEVANCE, LATEST }

    /** 최신순은 단계 0 하나다 (커서 {단계, 시각, 번호}). */
    static final int LATEST_STAGE = 0;
    static final int PEOPLE_LIMIT = 20;

    private static final String TITLE = "p.title ILIKE ?";
    private static final String TAG = "EXISTS (SELECT 1 FROM post_tag pt JOIN tag g ON g.id = pt.tag_id WHERE pt.post_id = p.id AND g.name ILIKE ?)";
    private static final String BODY = "p.content_md ILIKE ?";

    private final JdbcTemplate jdbc;
    private final CursorCodec cursors;
    private final ImageUrls imageUrls;
    private final ContentRenderer renderer;
    private final int pageSize;
    private final int recentWindow;

    public SearchQuery(JdbcTemplate jdbc, CursorCodec cursors, ImageUrls imageUrls, ContentRenderer renderer, BlogProperties props) {
        this.jdbc = jdbc;
        this.cursors = cursors;
        this.imageUrls = imageUrls;
        this.renderer = renderer;
        this.pageSize = props.feed().pageSize();
        this.recentWindow = props.search().recentWindow();
    }

    /** 목록 카드(docs/10 §2)와 같은 모양에서 미리보기 자리만 검색어 주변 문장이다. snippetHtml에는 mark 외 태그가 없다. */
    public record Hit(long id, String url, String title, String snippetHtml, String thumbnailUrl, Instant firstPublicAt,
                      int commentCount, int likeCount, Author author) {}

    /** @param notice TWO_CHAR_TITLE_TAG_ONLY(2글자 단어 안내), TOO_SHORT(남는 단어 없음) 또는 null */
    public record PostPage(String query, List<Hit> items, String nextCursor, String notice) {}

    public record Person(long id, String handle, String nickname, String bioFirstLine, String profileImageUrl) {}

    public record PeoplePage(String query, List<Person> items, String notice) {}

    private record Found(int stage, long id, Instant at) {}

    /** 한 조건 조각과 그 인자. */
    private record Sql(String text, List<Object> args) {
        static Sql and(List<Sql> parts) {
            return join(parts, " AND ");
        }

        static Sql or(List<Sql> parts) {
            return join(parts, " OR ");
        }

        private static Sql join(List<Sql> parts, String op) {
            StringBuilder sb = new StringBuilder("(");
            List<Object> args = new ArrayList<>();
            for (Sql p : parts) {
                if (sb.length() > 1) sb.append(op);
                sb.append(p.text);
                args.addAll(p.args);
            }
            return new Sql(sb.append(')').toString(), args);
        }

        Sql andNot(Sql other) {
            List<Object> all = new ArrayList<>(args);
            all.addAll(other.args);
            return new Sql("(" + text + " AND NOT " + other.text + ")", all);
        }
    }

    /**
     * @param authorId 블로그 안 검색이면 그 블로그 주인 (FR-003). 본인이 봐도 공개 글만이다
     */
    public PostPage posts(String rawQuery, Sort sort, String cursor, Long authorId) {
        SearchTerms terms = SearchTerms.parse(rawQuery);
        if (terms.isEmpty()) return new PostPage(terms.normalized(), List.of(), null, "TOO_SHORT");
        String notice = terms.hasShortWord() ? "TWO_CHAR_TITLE_TAG_ONLY" : null;
        String listName = "search:" + (sort == Sort.LATEST ? "l" : "r") + ":" + (authorId == null ? "all" : authorId) + ":" + terms.fingerprint();
        List<Integer> stages = sort == Sort.LATEST ? List.of(LATEST_STAGE)
                : terms.hasBodyWord() ? List.of(1, 2, 3) : List.of(1, 2);

        int fromStage = stages.get(0);
        Instant cursorAt = null;
        Long cursorId = null;
        if (cursor != null && !cursor.isBlank()) {
            long[] k = cursors.decode(cursor, listName, 3);
            if (!stages.contains((int) k[0])) throw ApiException.badRequest("INVALID_CURSOR", "목록 위치 값이 올바르지 않아요. 처음부터 다시 불러와 주세요.");
            fromStage = (int) k[0];
            cursorAt = Times.fromEpochMicros(k[1]);
            cursorId = k[2];
        }

        // 9개 + 다음 페이지 확인용 1개. 한 단계가 모자라면 같은 페이지에서 다음 단계로 이어 채운다 (FR-013)
        List<Found> found = new ArrayList<>();
        for (int stage : stages) {
            if (stage < fromStage) continue;
            int need = pageSize + 1 - found.size();
            if (need <= 0) break;
            boolean continuing = stage == fromStage && cursorAt != null;
            found.addAll(findStage(terms, stage, authorId, continuing ? cursorAt : null, continuing ? cursorId : null, need));
        }
        CursorCodec.Page<Found> page = CursorCodec.page(found, pageSize,
                f -> cursors.encode(listName, f.stage(), Times.toEpochMicros(f.at()), f.id()));
        return new PostPage(terms.normalized(), hits(page.items(), terms), page.nextCursor(), notice);
    }

    /** 사람 검색 (FR-004): 탈퇴 신청 제외, 닉네임·주소가 정확히 같으면 먼저, 최대 20명. */
    public PeoplePage people(String rawQuery) {
        String q = SearchTerms.parse(rawQuery).normalized();
        if (q.startsWith("@")) q = q.substring(1).strip();
        if (SearchTerms.length(q) < 2) return new PeoplePage(q, List.of(), "TOO_SHORT");
        String like = SearchTerms.likePattern(q);
        List<Person> people = jdbc.query("""
                SELECT m.id, m.handle, m.nickname, m.bio, """ + PostSql.PROFILE_IMAGE_KEY + """

                FROM member m
                """ + PostSql.PROFILE_IMAGE_JOIN + """

                WHERE m.withdrawn_at IS NULL AND m.deleted_at IS NULL AND (m.nickname ILIKE ? OR m.handle ILIKE ?)
                ORDER BY (lower(m.nickname) = lower(?) OR m.handle = lower(?)) DESC, m.nickname, m.id
                LIMIT ?
                """, (rs, i) -> new Person(rs.getLong("id"), rs.getString("handle"), rs.getString("nickname"),
                BioText.firstLine(rs.getString("bio")), imageUrls.urlOf(rs.getString("profile_image_key"))),
                like, like, q, q, PEOPLE_LIMIT);
        return new PeoplePage(q, people, null);
    }

    private List<Found> findStage(SearchTerms terms, int stage, Long authorId, Instant cursorAt, Long cursorId, int need) {
        Sql condition = stageCondition(terms, stage);
        List<Object> scope = new ArrayList<>();
        StringBuilder scopeSql = new StringBuilder(PostAccessPolicy.PUBLIC_LIST_CONDITION);
        if (authorId != null) {
            scopeSql.append(" AND p.author_id = ?");
            scope.add(authorId);
        }
        if (cursorAt != null) {
            scopeSql.append(" AND (p.first_public_at, p.id) < (?, ?)");
            scope.add(Timestamp.from(cursorAt));
            scope.add(cursorId);
        }

        // ① 최근창: 커서 이후 최근 공개 글 N개 안에서
        List<Object> args = new ArrayList<>(scope);
        args.add(recentWindow);
        args.addAll(condition.args());
        args.add(need);
        List<Found> recent = jdbc.query("""
                SELECT p.id, p.first_public_at FROM (
                    SELECT p.id FROM post p JOIN member m ON m.id = p.author_id
                    WHERE\s""" + scopeSql + """

                    ORDER BY p.first_public_at DESC, p.id DESC LIMIT ?) w
                JOIN post p ON p.id = w.id
                WHERE\s""" + condition.text() + """

                ORDER BY p.first_public_at DESC, p.id DESC LIMIT ?
                """, (rs, i) -> new Found(stage, rs.getLong("id"), rs.getTimestamp("first_public_at").toInstant()), args.toArray());
        if (recent.size() >= need) return recent;

        // ② 모자라면 가장 긴 단어의 인덱스 후보에서 전체를 찾는다. 최근창 결과는 이 결과에 모두 들어 있다
        String word = terms.longest();
        String pattern = SearchTerms.likePattern(word);
        List<Object> all = new ArrayList<>();
        StringBuilder candidates = new StringBuilder("SELECT id FROM post WHERE title ILIKE ?");
        all.add(pattern);
        if (stage != 1) {
            candidates.append(" UNION SELECT pt.post_id FROM post_tag pt JOIN tag g ON g.id = pt.tag_id WHERE g.name ILIKE ?");
            all.add(pattern);
        }
        if ((stage == 3 || stage == LATEST_STAGE) && SearchTerms.searchesBody(word)) {
            candidates.append(" UNION SELECT id FROM post WHERE content_md ILIKE ?");
            all.add(pattern);
        }
        all.addAll(scope);
        all.addAll(condition.args());
        all.add(need);
        return jdbc.query("SELECT p.id, p.first_public_at FROM post p JOIN member m ON m.id = p.author_id WHERE p.id IN ("
                + candidates + ") AND " + scopeSql + " AND " + condition.text()
                + " ORDER BY p.first_public_at DESC, p.id DESC LIMIT ?",
                (rs, i) -> new Found(stage, rs.getLong("id"), rs.getTimestamp("first_public_at").toInstant()), all.toArray());
    }

    /**
     * 단계 조건 (FR-012). ① 모든 단어가 제목에 → ② ①이 아니고 모든 단어가 제목 또는 태그에 → ③ ②까지가 아니고 모든 단어가
     * 제목·태그·본문(3글자 이상 단어만) 어딘가에. 최신순(0)은 "어딘가에"만.
     */
    private Sql stageCondition(SearchTerms terms, int stage) {
        List<Sql> inTitle = new ArrayList<>();
        List<Sql> inTitleOrTag = new ArrayList<>();
        List<Sql> anywhere = new ArrayList<>();
        for (String w : terms.words()) {
            String p = SearchTerms.likePattern(w);
            Sql title = new Sql(TITLE, List.of(p));
            Sql tag = new Sql(TAG, List.of(p.toLowerCase()));
            inTitle.add(title);
            inTitleOrTag.add(Sql.or(List.of(title, tag)));
            anywhere.add(SearchTerms.searchesBody(w) ? Sql.or(List.of(title, tag, new Sql(BODY, List.of(p)))) : Sql.or(List.of(title, tag)));
        }
        return switch (stage) {
            case 1 -> Sql.and(inTitle);
            case 2 -> Sql.and(inTitleOrTag).andNot(Sql.and(inTitle));
            case 3 -> Sql.and(anywhere).andNot(Sql.and(inTitleOrTag));
            default -> Sql.and(anywhere);
        };
    }

    /** 찾은 글 번호들의 결과 카드 */
    private static final String HITS = """
            SELECT p.id, p.title, p.content_md, p.first_public_at, s.comment_count, s.like_count,
                   m.id AS author_id, m.handle, m.nickname, """ + PostSql.THUMBNAIL_KEY + ", " + PostSql.PROFILE_IMAGE_KEY + """

            FROM post p JOIN member m ON m.id = p.author_id
            """ + PostSql.STAT_JOIN + " " + PostSql.PROFILE_IMAGE_JOIN + """

            WHERE p.id = ANY (?) AND\s""" + PostAccessPolicy.PUBLIC_LIST_CONDITION;

    private List<Hit> hits(List<Found> found, SearchTerms terms) {
        if (found.isEmpty()) return List.of();
        Long[] ids = found.stream().map(Found::id).toArray(Long[]::new);
        Pattern words = terms.highlightPattern();
        Map<Long, Hit> byId = new HashMap<>();
        jdbc.query(HITS, ps -> ps.setArray(1, ps.getConnection().createArrayOf("bigint", ids)), rs -> {
            long id = rs.getLong("id");
            String handle = rs.getString("handle");
            String title = rs.getString("title");
            byId.put(id, new Hit(id, "/@" + handle + "/posts/" + id, title,
                    Snippet.of(renderer.searchText(rs.getString("content_md")), title, words),
                    imageUrls.urlOf(rs.getString("thumbnail_key")), rs.getTimestamp("first_public_at").toInstant(),
                    rs.getInt("comment_count"), rs.getInt("like_count"),
                    new Author(rs.getLong("author_id"), handle, rs.getString("nickname"), imageUrls.urlOf(rs.getString("profile_image_key")))));
        });
        // 두 쿼리 사이에 비공개·휴지통으로 바뀐 글은 빠진다. 순서는 찾은 순서 그대로
        return found.stream().map(f -> byId.get(f.id())).filter(java.util.Objects::nonNull).toList();
    }
}
