package com.team.blog.page;

import java.net.URI;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.team.blog.discovery.application.FeedQuery;
import com.team.blog.discovery.application.PostDetailQuery;
import com.team.blog.post.access.Viewer;
import com.team.blog.post.domain.PostStatus;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

/**
 * 화면 주소를 React 앱으로 연결하면서, 링크 미리보기·검색 엔진이 읽을 머리말과 첫 화면 HTML을 서버에서 채운다.
 * 글 주소 처리 순서는 docs/40 §3: 대문자 → 301, 숫자 아님 → 404, 판정(canRead) → 404, 다른 블로그 주소 → 301,
 * 작성자 본인의 임시글 → 302 에디터. 판정을 301보다 먼저 해서 볼 수 없는 글의 작성자가 드러나지 않게 한다.
 */
@Controller
public class PageController {
    private static final Pattern HANDLE_CHARS = Pattern.compile("[A-Za-z0-9_-]{1,23}");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy.MM.dd").withZone(ZoneId.of("Asia/Seoul"));

    private final SpaShell shell;
    private final FeedQuery feed;
    private final PostDetailQuery details;
    private final BlogProperties.Site site;

    public PageController(SpaShell shell, FeedQuery feed, PostDetailQuery details, BlogProperties props) {
        this.shell = shell;
        this.feed = feed;
        this.details = details;
        this.site = props.site();
    }

    @GetMapping({"/", "/index.html"})
    public ResponseEntity<String> home() {
        FeedQuery.Page first = feed.home(null);
        String body = "<main><h1>" + SpaShell.esc(site.name()) + "</h1>" + cards(first) + "</main>";
        HeadMeta meta = HeadMeta.site(site.name(), "개발자가 Markdown으로 글을 쓰고 나누는 블로그", absolute("/"), absolute(site.defaultOgImage()));
        return html(HttpStatus.OK, shell.render(meta, body, Map.of("page", "home", "feed", first)), CacheControl.noCache());
    }

    @GetMapping("/@{handle}")
    public ResponseEntity<String> blog(@PathVariable String handle, @CurrentMember(required = false) MemberPrincipal me) {
        if (!HANDLE_CHARS.matcher(handle).matches()) return notFound();
        if (!handle.equals(handle.toLowerCase())) return redirect(HttpStatus.MOVED_PERMANENTLY, "/@" + handle.toLowerCase());
        var profile = feed.profile(handle, me == null ? null : me.id());
        if (profile.isEmpty()) return notFound();
        FeedQuery.BlogProfile p = profile.get();
        FeedQuery.Page first = feed.blog(handle, null);
        String body = "<main><header><h1>" + SpaShell.esc(p.nickname()) + "</h1><p>@" + SpaShell.esc(p.handle()) + "</p>"
                + (p.bio() == null ? "" : "<p>" + SpaShell.esc(p.bio()) + "</p>") + "</header>" + cards(first) + "</main>";
        String description = p.bio() == null || p.bio().isBlank() ? p.nickname() + "의 블로그" : truncate(p.bio(), 160);
        HeadMeta meta = new HeadMeta(p.nickname() + " (@" + p.handle() + ") - " + site.name(), description,
                absolute("/@" + p.handle()), "profile", p.profileImageUrl() != null ? p.profileImageUrl() : absolute(site.defaultOgImage()),
                null, null, true);
        return html(HttpStatus.OK, shell.render(meta, body, Map.of("page", "blog", "profile", p, "feed", first)),
                CacheControl.noCache().cachePrivate());
    }

    @GetMapping("/@{handle}/posts/{postId}")
    public ResponseEntity<String> post(@PathVariable String handle, @PathVariable String postId,
                                       @CurrentMember(required = false) MemberPrincipal me) {
        if (!HANDLE_CHARS.matcher(handle).matches()) return notFound();
        if (!handle.equals(handle.toLowerCase())) {
            return redirect(HttpStatus.MOVED_PERMANENTLY, "/@" + handle.toLowerCase() + "/posts/" + postId);
        }
        if (!postId.matches("[1-9][0-9]{0,17}")) return notFound();
        var found = details.find(Long.parseLong(postId), Viewer.of(me));
        if (found.isEmpty()) return notFound();
        PostDetailQuery.Detail d = found.get();
        if (!d.author().handle().equals(handle)) return redirect(HttpStatus.MOVED_PERMANENTLY, d.url());
        if (d.status() == PostStatus.DRAFT) return redirect(HttpStatus.FOUND, "/write/" + d.id());

        String body = article(d);
        HeadMeta meta;
        if (d.publiclyVisible()) {
            String description = d.excerpt() == null ? "" : truncate(d.excerpt(), 160);
            meta = new HeadMeta(d.title() + " - " + d.author().nickname(), description, absolute(d.url()), "article",
                    d.thumbnailUrl() != null ? d.thumbnailUrl() : absolute(site.defaultOgImage()),
                    d.firstPublicAt(), d.editedAt(), true);
        } else {
            meta = new HeadMeta(d.title() + " - " + site.name(), null, null, null, null, null, null, false);
        }
        CacheControl cc = d.publiclyVisible() ? CacheControl.noCache().cachePrivate() : CacheControl.noStore().cachePrivate();
        return html(HttpStatus.OK, shell.render(meta, body, Map.of("page", "post", "post", d)), cc);
    }

    /** 로그인이 필요하거나 개인적인 화면: 같은 껍데기, 수집 거부, 저장 안 함. React가 그린다. */
    @GetMapping({"/login", "/signup/social", "/agreements", "/write", "/write/{id}", "/manage/posts", "/settings",
            "/settings/{section}"})
    public ResponseEntity<String> app() {
        return html(HttpStatus.OK, shell.render(HeadMeta.privatePage(site.name(), null), "", Map.of("page", "app")),
                CacheControl.noStore());
    }

    private ResponseEntity<String> notFound() {
        String body = "<main><h1>볼 수 없는 페이지예요</h1><p>주소가 바뀌었거나, 삭제·비공개된 글일 수 있어요.</p><a href=\"/\">홈으로</a></main>";
        return html(HttpStatus.NOT_FOUND, shell.render(HeadMeta.privatePage(site.name(), "볼 수 없는 페이지예요"), body,
                Map.of("page", "notFound")), CacheControl.noStore());
    }

    private String article(PostDetailQuery.Detail d) {
        StringBuilder sb = new StringBuilder("<main><article>");
        sb.append("<h1>").append(SpaShell.esc(d.title())).append("</h1>");
        sb.append("<p><a href=\"/@").append(SpaShell.esc(d.author().handle())).append("\">")
                .append(SpaShell.esc(d.author().nickname())).append(" @").append(SpaShell.esc(d.author().handle()))
                .append("</a> · <time datetime=\"").append(d.displayDate()).append("\">")
                .append(DATE.format(d.displayDate())).append("</time>");
        if (d.editedAt() != null) {
            sb.append(" · 수정됨 <time datetime=\"").append(d.editedAt()).append("\">").append(DATE.format(d.editedAt())).append("</time>");
        }
        sb.append("</p>");
        sb.append("<div class=\"post-body\">").append(d.contentHtml()).append("</div>"); // 발행 때 정화한 HTML
        sb.append("</article></main>");
        return sb.toString();
    }

    private String cards(FeedQuery.Page page) {
        StringBuilder sb = new StringBuilder("<ul>");
        for (FeedQuery.Card c : page.items()) {
            sb.append("<li><a href=\"").append(SpaShell.esc(c.url())).append("\">").append(SpaShell.esc(c.title()))
                    .append("</a> <span>").append(SpaShell.esc(c.author().nickname())).append("</span>");
            if (c.excerpt() != null) sb.append("<p>").append(SpaShell.esc(c.excerpt())).append("</p>");
            sb.append("</li>");
        }
        return sb.append("</ul>").toString();
    }

    private String absolute(String path) {
        if (path == null) return null;
        if (path.startsWith("http://") || path.startsWith("https://")) return path;
        String base = site.baseUrl() == null ? "" : site.baseUrl().replaceAll("/+$", "");
        return base + path;
    }

    private static String truncate(String s, int max) {
        return s.codePointCount(0, s.length()) <= max ? s : s.substring(0, s.offsetByCodePoints(0, max)) + "…";
    }

    private static ResponseEntity<String> html(HttpStatus status, String body, CacheControl cc) {
        return ResponseEntity.status(status).contentType(new MediaType(MediaType.TEXT_HTML, java.nio.charset.StandardCharsets.UTF_8))
                .cacheControl(cc).body(body);
    }

    private static ResponseEntity<String> redirect(HttpStatus status, String location) {
        return ResponseEntity.status(status).location(URI.create(location)).build();
    }

}
