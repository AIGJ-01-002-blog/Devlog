package com.team.blog.page;

import java.net.URI;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.regex.Pattern;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.util.UriUtils;

import com.team.blog.comment.application.CommentQuery;
import com.team.blog.discovery.application.FeedQuery;
import com.team.blog.follow.application.FollowQuery;
import com.team.blog.trending.application.TrendingService;
import com.team.blog.discovery.application.PostDetailQuery;
import com.team.blog.post.access.Viewer;
import com.team.blog.post.domain.PostStatus;
import com.team.blog.search.application.SearchQuery;
import com.team.blog.search.web.SearchController;
import com.team.blog.series.application.SeriesQuery;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;
import com.team.blog.tag.application.TagNormalizer;
import com.team.blog.tag.application.TagQuery;
import com.team.blog.tag.web.TagController;

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
    private final TagQuery tags;
    private final TagController tagApi;
    private final CommentQuery comments;
    private final SearchQuery search;
    private final FollowQuery follows;
    private final TrendingService trending;
    private final SeriesQuery series;

    public PageController(SpaShell shell, FeedQuery feed, PostDetailQuery details, BlogProperties props, TagQuery tags,
                          TagController tagApi, CommentQuery comments, SearchQuery search, FollowQuery follows,
                          TrendingService trending, SeriesQuery series) {
        this.series = series;
        this.trending = trending;
        this.follows = follows;
        this.comments = comments;
        this.search = search;
        this.shell = shell;
        this.feed = feed;
        this.details = details;
        this.site = props.site();
        this.tags = tags;
        this.tagApi = tagApi;
    }

    /** 태그 주소: 이름을 경로 조각으로 인코딩한다. #은 %23, +·.은 그대로 (docs/22 §5). */
    public static String tagPath(String name) {
        return "/tags/" + UriUtils.encodePathSegment(name, java.nio.charset.StandardCharsets.UTF_8);
    }

    @GetMapping("/tags")
    public ResponseEntity<String> tagIndex() {
        var top = tags.top(100);
        StringBuilder body = new StringBuilder("<main><h1>태그</h1>");
        if (top.isEmpty()) body.append("<p>아직 태그가 없어요.</p>");
        else {
            body.append("<ul>");
            top.forEach(t -> body.append("<li><a href=\"").append(SpaShell.esc(tagPath(t.name()))).append("\">#")
                    .append(SpaShell.esc(t.name())).append("</a> ").append(t.postCount()).append("</li>"));
            body.append("</ul>");
        }
        body.append("</main>");
        HeadMeta meta = HeadMeta.site("태그 - " + site.name(), "공개 글에 쓰인 태그", absolute("/tags"), absolute(site.defaultOgImage()));
        return html(HttpStatus.OK, shell.render(meta, body.toString(), Map.of("page", "tags", "tags", top)), CacheControl.noCache());
    }

    /** 태그별 목록 (010 FR-019~FR-022): 형식 안 맞음 404, 정규화 안 된 주소 301, 공개 글 없으면 200 + 빈 상태. */
    @GetMapping("/tags/{name}")
    public ResponseEntity<String> tag(@PathVariable String name) {
        var canonical = TagNormalizer.canonical(name);
        if (canonical.isEmpty()) return notFound();
        if (!canonical.get().equals(name)) return redirect(HttpStatus.MOVED_PERMANENTLY, tagPath(canonical.get()));
        TagController.TagPage page = tagApi.page(name, null);
        String body = "<main><h1>#" + SpaShell.esc(name) + "</h1><p>공개 글 " + page.postCount() + "</p>"
                + (page.items().isEmpty() ? "<p>아직 이 태그로 공개된 글이 없어요.</p>"
                : cards(new FeedQuery.Page(page.items(), page.nextCursor()))) + "</main>";
        HeadMeta meta = HeadMeta.site("#" + name + " - " + site.name(), "#" + name + " 태그가 달린 글", absolute(tagPath(name)),
                absolute(site.defaultOgImage()));
        return html(HttpStatus.OK, shell.render(meta, body, Map.of("page", "tag", "tag", page)), CacheControl.noCache());
    }

    /**
     * 검색 결과 화면 (014, docs/33 §5). 검색 엔진 수집 거부(FR-022), 저장 안 함. 글 탭은 첫 결과를 함께 내려준다.
     * 요청 제한은 API에만 둔다(화면 주소는 링크 미리보기 등이 열 수 있어 같은 결과를 그린다).
     */
    @GetMapping("/search")
    public ResponseEntity<String> search(@RequestParam(required = false) String q, @RequestParam(required = false) String tab,
                                         @RequestParam(required = false) String sort) {
        String title = q == null || q.isBlank() ? "검색" : "'" + truncate(q.strip(), 50) + "' 검색";
        HeadMeta meta = HeadMeta.privatePage(site.name(), title);
        if (q == null || q.isBlank() || "people".equals(tab)) {
            return html(HttpStatus.OK, shell.render(meta, "<main><h1>검색</h1></main>", Map.of("page", "search")), CacheControl.noStore());
        }
        SearchQuery.PostPage result = search.posts(q, SearchController.parseSort(sort), null, null);
        StringBuilder body = new StringBuilder("<main><h1>").append(SpaShell.esc(title)).append("</h1><ul>");
        for (SearchQuery.Hit h : result.items()) {
            body.append("<li><a href=\"").append(SpaShell.esc(h.url())).append("\">").append(SpaShell.esc(h.title()))
                    .append("</a> <span>").append(SpaShell.esc(h.author().nickname())).append("</span>");
            if (h.snippetHtml() != null) body.append("<p>").append(h.snippetHtml()).append("</p>"); // mark 외 태그 없음 (FR-019)
            body.append("</li>");
        }
        body.append("</ul></main>");
        return html(HttpStatus.OK, shell.render(meta, body.toString(), Map.of("page", "search", "result", result)), CacheControl.noStore());
    }

    @GetMapping({"/", "/index.html"})
    public ResponseEntity<String> home(@RequestParam(required = false) String tab) {
        if ("trending".equals(tab)) {
            // 트렌딩 탭 (017): 첫 9개를 함께 내려준다. 순위표 문제로 바로 계산한 결과면 저장하지 않는다
            TrendingService.Page t = trending.page(null);
            FeedQuery.Page asFeed = new FeedQuery.Page(t.items(), t.nextCursor());
            String body = "<main><h1>트렌딩</h1>" + cards(asFeed) + "</main>";
            HeadMeta meta = HeadMeta.site(site.name(), "최근 7일 동안 반응이 많은 글", absolute("/?tab=trending"), absolute(site.defaultOgImage()));
            return html(HttpStatus.OK, shell.render(meta, body, Map.of("page", "home", "trending", asFeed)),
                    t.temporary() ? CacheControl.noStore() : CacheControl.noCache());
        }
        FeedQuery.Page first = feed.home(null);
        String body = "<main><h1>" + SpaShell.esc(site.name()) + "</h1>" + cards(first) + "</main>";
        HeadMeta meta = HeadMeta.site(site.name(), "개발자가 Markdown으로 글을 쓰고 나누는 블로그", absolute("/"), absolute(site.defaultOgImage()));
        return html(HttpStatus.OK, shell.render(meta, body, Map.of("page", "home", "feed", first)), CacheControl.noCache());
    }

    @GetMapping("/@{handle}")
    public ResponseEntity<String> blog(@PathVariable String handle, @RequestParam(required = false) String tag,
                                       @RequestParam(required = false) String q,
                                       @CurrentMember(required = false) MemberPrincipal me) {
        if (!HANDLE_CHARS.matcher(handle).matches()) return notFound();
        String tagQuery = tag == null || tag.isEmpty() ? "" : "?tag=" + java.net.URLEncoder.encode(tag, java.nio.charset.StandardCharsets.UTF_8);
        if (!handle.equals(handle.toLowerCase())) return redirect(HttpStatus.MOVED_PERMANENTLY, "/@" + handle.toLowerCase() + tagQuery);
        // 블로그 안 태그 필터 (010 FR-031): 형식 안 맞음 404, 정규화 안 된 값 301
        String filter = null;
        if (!tagQuery.isEmpty()) {
            var canonical = TagNormalizer.canonical(tag);
            if (canonical.isEmpty()) return notFound();
            if (!canonical.get().equals(tag)) {
                return redirect(HttpStatus.MOVED_PERMANENTLY, "/@" + handle + "?tag="
                        + java.net.URLEncoder.encode(canonical.get(), java.nio.charset.StandardCharsets.UTF_8));
            }
            filter = tag;
        }
        var profile = feed.profile(handle, me == null ? null : me.id());
        if (profile.isEmpty()) return notFound();
        FeedQuery.BlogProfile p = profile.get();
        FeedQuery.Page first = feed.blog(handle, filter, null, me == null ? null : me.id());
        var blogTags = tags.blogTags(p.id());
        String body = "<main><header><h1>" + SpaShell.esc(p.nickname()) + "</h1><p>@" + SpaShell.esc(p.handle()) + "</p>"
                + (p.bio() == null ? "" : "<p>" + SpaShell.esc(p.bio()) + "</p>") + "</header>" + cards(first) + "</main>";
        String description = p.bio() == null || p.bio().isBlank() ? p.nickname() + "의 블로그" : truncate(p.bio(), 160);
        HeadMeta meta = new HeadMeta(p.nickname() + " (@" + p.handle() + ") - " + site.name(), description,
                absolute("/@" + p.handle()), "profile", p.profileImageUrl() != null ? p.profileImageUrl() : absolute(site.defaultOgImage()),
                null, null, q == null || q.isBlank()); // 블로그 안 검색 결과는 수집 거부 (014 FR-022)
        return html(HttpStatus.OK, shell.render(meta, body, filter == null
                        ? Map.of("page", "blog", "profile", p, "feed", first, "blogTags", blogTags)
                        : Map.of("page", "blog", "profile", p, "feed", first, "blogTags", blogTags, "tag", filter)),
                first.friendsView() ? CacheControl.noStore().cachePrivate() : CacheControl.noCache().cachePrivate());
    }

    /** 팔로워·팔로잉 목록 (016 US3). 누구나 보지만 보는 사람마다 버튼 상태가 달라 공유 캐시에 넣지 않는다. 얇은 목록이라 수집하지 않는다. */
    @GetMapping({"/@{handle}/followers", "/@{handle}/following"})
    public ResponseEntity<String> follows(@PathVariable String handle, HttpServletRequest request,
                                          @CurrentMember(required = false) MemberPrincipal me) {
        if (!HANDLE_CHARS.matcher(handle).matches()) return notFound();
        boolean followers = request.getRequestURI().endsWith("/followers");
        if (!handle.equals(handle.toLowerCase())) {
            return redirect(HttpStatus.MOVED_PERMANENTLY, "/@" + handle.toLowerCase() + (followers ? "/followers" : "/following"));
        }
        var profile = feed.profile(handle, me == null ? null : me.id());
        if (profile.isEmpty()) return notFound();
        FeedQuery.BlogProfile p = profile.get();
        FollowQuery.Page first = follows.list(handle, followers ? FollowQuery.Direction.FOLLOWERS : FollowQuery.Direction.FOLLOWING,
                null, me == null ? null : me.id());
        String title = p.nickname() + (followers ? "님의 팔로워" : "님이 팔로우하는 사람");
        StringBuilder body = new StringBuilder("<main><h1>").append(SpaShell.esc(title)).append("</h1><ul>");
        first.items().forEach(x -> body.append("<li><a href=\"/@").append(SpaShell.esc(x.handle())).append("\">")
                .append(SpaShell.esc(x.nickname())).append(" @").append(SpaShell.esc(x.handle())).append("</a></li>"));
        body.append("</ul></main>");
        return html(HttpStatus.OK, shell.render(HeadMeta.privatePage(site.name(), title), body.toString(),
                Map.of("page", "follows", "profile", p, "follows", first)), CacheControl.noCache().cachePrivate());
    }

    /** 블로그의 시리즈 탭 (024 US2-2). 남과 다른 응답(친구·주인)은 저장하지 않는다. */
    @GetMapping("/@{handle}/series")
    public ResponseEntity<String> seriesList(@PathVariable String handle, @CurrentMember(required = false) MemberPrincipal me) {
        if (!HANDLE_CHARS.matcher(handle).matches()) return notFound();
        if (!handle.equals(handle.toLowerCase())) return redirect(HttpStatus.MOVED_PERMANENTLY, "/@" + handle.toLowerCase() + "/series");
        var profile = feed.profile(handle, me == null ? null : me.id());
        var listing = series.list(handle, me == null ? null : me.id());
        if (profile.isEmpty() || listing.isEmpty()) return notFound();
        FeedQuery.BlogProfile p = profile.get();
        String title = p.nickname() + "님의 시리즈";
        StringBuilder body = new StringBuilder("<main><h1>").append(SpaShell.esc(title)).append("</h1><ul>");
        listing.get().items().forEach(x -> body.append("<li><a href=\"").append(SpaShell.esc(seriesPath(handle, x.slug()))).append("\">")
                .append(SpaShell.esc(x.name())).append("</a> (").append(x.postCount()).append(")</li>"));
        body.append("</ul></main>");
        HeadMeta meta = new HeadMeta(title + " - " + site.name(), p.nickname() + "의 블로그 시리즈", absolute("/@" + handle + "/series"),
                "website", p.profileImageUrl() != null ? p.profileImageUrl() : absolute(site.defaultOgImage()), null, null, true);
        return html(HttpStatus.OK, shell.render(meta, body.toString(), Map.of("page", "series-list")),
                listing.get().personal() ? CacheControl.noStore().cachePrivate() : CacheControl.noCache().cachePrivate());
    }

    /** 시리즈 페이지 (024 US2-2). 글 목록을 순서대로 담아 수집한다. */
    @GetMapping("/@{handle}/series/{slug}")
    public ResponseEntity<String> seriesDetail(@PathVariable String handle, @PathVariable String slug,
                                               @CurrentMember(required = false) MemberPrincipal me) {
        if (!HANDLE_CHARS.matcher(handle).matches()) return notFound();
        if (!handle.equals(handle.toLowerCase())) return redirect(HttpStatus.MOVED_PERMANENTLY, seriesPath(handle.toLowerCase(), slug));
        var found = series.detail(handle, slug, me == null ? null : me.id());
        if (found.isEmpty()) return notFound();
        SeriesQuery.Detail d = found.get();
        StringBuilder body = new StringBuilder("<main><h1>").append(SpaShell.esc(d.name())).append("</h1><ol>");
        d.posts().forEach(c -> body.append("<li><a href=\"").append(SpaShell.esc(c.url())).append("\">").append(SpaShell.esc(c.title()))
                .append("</a></li>"));
        body.append("</ol></main>");
        String owner = d.posts().isEmpty() ? handle : d.posts().getFirst().author().nickname();
        String image = d.posts().stream().map(FeedQuery.Card::thumbnailUrl).filter(java.util.Objects::nonNull).findFirst()
                .orElse(absolute(site.defaultOgImage()));
        HeadMeta meta = new HeadMeta(d.name() + " - " + owner, owner + "의 시리즈 · 글 " + d.posts().size() + "개",
                absolute(seriesPath(handle, d.slug())), "website", image, null, d.updatedAt(), !d.posts().isEmpty());
        return html(HttpStatus.OK, shell.render(meta, body.toString(), Map.of("page", "series")),
                d.personal() ? CacheControl.noStore().cachePrivate() : CacheControl.noCache().cachePrivate());
    }

    static String seriesPath(String handle, String slug) {
        return "/@" + handle + "/series/" + UriUtils.encodePathSegment(slug, java.nio.charset.StandardCharsets.UTF_8);
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
        return html(HttpStatus.OK, shell.render(meta, body, Map.of("page", "post", "post", d,
                // 글 상세를 열면 첫 20개 댓글이 함께 보인다 (011 FR-026)
                "comments", comments.page(d.id(), Viewer.of(me), null, null, null))), cc);
    }

    /** 로그인이 필요하거나 개인적인 화면: 같은 껍데기, 수집 거부, 저장 안 함. React가 그린다. */
    @GetMapping({"/login", "/signup", "/signup/social", "/forgot-password", "/reset-password", "/verify-email", "/agreements", "/write", "/write/{id}", "/manage/posts", "/settings", "/notifications", "/feed", "/terms", "/privacy",
            "/settings/{section}"})
    public ResponseEntity<String> app() {
        return html(HttpStatus.OK, shell.render(HeadMeta.privatePage(site.name(), null), "", Map.of("page", "app")),
                CacheControl.noStore());
    }

    /**
     * 관리자 화면 (019 FR-011). 비회원은 있는 주소·없는 주소 모두 로그인으로, 일반 회원은 없는 페이지와 같은 404다.
     */
    @GetMapping({"/admin", "/admin/**"})
    public ResponseEntity<String> admin(HttpServletRequest request, @CurrentMember(required = false) MemberPrincipal me) {
        if (me == null) {
            String back = request.getRequestURI() + (request.getQueryString() == null ? "" : "?" + request.getQueryString());
            return redirect(HttpStatus.FOUND, "/login?redirect=" + UriUtils.encodeQueryParam(back, java.nio.charset.StandardCharsets.UTF_8));
        }
        if (!me.isAdmin()) return notFound();
        return app();
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
        if (!d.tags().isEmpty()) {
            sb.append("<ul class=\"post-tags\">");
            d.tags().forEach(t -> sb.append("<li><a href=\"").append(SpaShell.esc(tagPath(t))).append("\">#").append(SpaShell.esc(t)).append("</a></li>"));
            sb.append("</ul>");
        }
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
