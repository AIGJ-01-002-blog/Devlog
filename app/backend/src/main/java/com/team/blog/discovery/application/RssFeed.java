package com.team.blog.discovery.application;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import com.team.blog.account.application.MemberQueryService;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.post.infra.PostSql;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.markdown.ContentRenderer;
import com.team.blog.shared.text.TextCleaner;

/**
 * RSS 2.0 (spec 026). 전체 최신 공개 글과 블로그별 공개 글을 20개씩. 공개 목록과 같은 조건이라 친구 공개·비공개 글은 나오지 않는다.
 * 본문 대신 요약(앞 600자)만 넣어 목록 쿼리 비용 그대로 만든다.
 */
@Service
public class RssFeed {
    public static final int SIZE = 20;
    private static final DateTimeFormatter RFC_1123 = DateTimeFormatter.RFC_1123_DATE_TIME.withZone(ZoneOffset.UTC);

    private final JdbcTemplate jdbc;
    private final ContentRenderer renderer;
    private final MemberQueryService members;
    private final BlogProperties.Site site;

    public RssFeed(JdbcTemplate jdbc, ContentRenderer renderer, MemberQueryService members, BlogProperties props) {
        this.jdbc = jdbc;
        this.members = members;
        this.renderer = renderer;
        this.site = props.site();
    }

    private record Item(long id, String title, String excerpt, java.time.Instant at, String handle, String nickname) {}

    public String site() {
        return channel(site.name(), "/", site.name() + "의 최신 글", items(null));
    }

    /** 없는 블로그면 비어 있다 */
    public Optional<String> blog(String handle) {
        return members.findActiveByHandle(handle)
                .map(m -> channel(m.nickname() + " (@" + m.handle() + ") - " + site.name(), "/@" + m.handle(),
                        m.nickname() + "의 블로그", items(m.id())));
    }

    private List<Item> items(Long authorId) {
        String sql = "SELECT p.id, p.title, p.first_public_at, m.handle, m.nickname, " + PostSql.SUMMARY_SOURCE
                + " FROM post p JOIN member m ON m.id = p.author_id WHERE " + PostAccessPolicy.PUBLIC_LIST_CONDITION
                + (authorId == null ? "" : " AND p.author_id = ?")
                + " ORDER BY p.first_public_at DESC, p.id DESC LIMIT " + SIZE;
        Object[] args = authorId == null ? new Object[0] : new Object[] {authorId};
        return jdbc.query(sql, (rs, i) -> new Item(rs.getLong("id"), rs.getString("title"), renderer.summary(rs.getString("summary"), rs.getString("content_head")),
                rs.getTimestamp("first_public_at").toInstant(), rs.getString("handle"), rs.getString("nickname")), args);
    }

    private String channel(String title, String path, String description, List<Item> items) {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n<channel>\n")
                .append("<title>").append(x(title)).append("</title>\n")
                .append("<link>").append(x(absolute(path))).append("</link>\n")
                .append("<description>").append(x(description)).append("</description>\n")
                .append("<language>ko</language>\n")
                .append("<atom:link href=\"").append(x(absolute(path.equals("/") ? "/rss" : path + "/rss")))
                .append("\" rel=\"self\" type=\"application/rss+xml\"/>\n");
        if (!items.isEmpty()) xml.append("<lastBuildDate>").append(RFC_1123.format(items.getFirst().at())).append("</lastBuildDate>\n");
        for (Item it : items) {
            String link = absolute("/@" + it.handle() + "/posts/" + it.id());
            xml.append("<item>\n<title>").append(x(it.title())).append("</title>\n")
                    .append("<link>").append(x(link)).append("</link>\n")
                    .append("<guid isPermaLink=\"true\">").append(x(link)).append("</guid>\n")
                    .append("<pubDate>").append(RFC_1123.format(it.at())).append("</pubDate>\n")
                    .append("<dc:creator>").append(x(it.nickname())).append("</dc:creator>\n");
            if (it.excerpt() != null && !it.excerpt().isBlank()) xml.append("<description>").append(x(it.excerpt())).append("</description>\n");
            xml.append("</item>\n");
        }
        return xml.append("</channel>\n</rss>\n").toString();
    }

    private String absolute(String path) {
        String base = site.baseUrl() == null ? "" : TextCleaner.trimEnd(site.baseUrl(), '/');
        return base + path;
    }

    /** XML 1.0에 쓸 수 없는 제어 문자를 빼고 이스케이프한다 */
    private static String x(String s) {
        if (s == null) return "";
        return HtmlUtils.htmlEscape(s.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", ""), "UTF-8");
    }
}
