package com.team.blog.mcp.application;

import java.time.Clock;
import java.time.Duration;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import com.team.blog.discovery.application.PostDetailQuery;
import com.team.blog.post.access.Viewer;
import com.team.blog.post.application.MyPostsQuery;
import com.team.blog.post.application.PostCommandService;
import com.team.blog.post.application.PostEditorQuery;
import com.team.blog.post.domain.PostStatus;
import com.team.blog.search.application.SearchQuery;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.time.Times;
import com.team.blog.shared.web.RateLimiter;
import com.team.blog.tag.application.TagNormalizer;
import com.team.blog.tag.application.TagQuery;

/**
 * devlog MCP 도구 (052). AI는 회원 본인의 권한 안에서만 읽고, 임시글과 "발행 대기"까지만 만든다.
 * 발행·공개 범위 변경·삭제 도구는 없다. 발행은 언제나 사람이 화면에서 한다.
 * 실패는 MCP 규칙대로 도구 결과(isError)로 돌려준다. AI가 읽고 사람에게 전할 수 있게 문장으로 쓴다.
 */
@Service
public class McpTools {
    static final int CALLS_PER_MINUTE = 60;
    static final int WRITES_PER_HOUR = 30;
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.of("Asia/Seoul"));

    public record Result(String text, boolean error) {
        static Result ok(String text) { return new Result(text, false); }
        static Result fail(String text) { return new Result(text, true); }
    }

    /** 도구 하나. write면 WRITE 토큰과 메일 인증이 필요하다. */
    record Tool(String name, String title, String description, boolean write, String inputSchema) {}

    private static final String DRAFT_SCHEMA = """
            {"type":"object","properties":{
              "title":{"type":"string","description":"글 제목 (100자까지)"},
              "content_md":{"type":"string","description":"본문 Markdown"},
              "tags":{"type":"array","items":{"type":"string"},"description":"태그 제안 (10개까지). 발행 창에 미리 채워진다"}},
             "required":["title","content_md"]}""";

    static final List<Tool> TOOLS = List.of(
            new Tool("write_devlog", "개발 일지 쓰기",
                    "오늘 사용자와 함께 한 작업(대화, 고친 코드, 커밋)을 개발 일지로 정리해 사용자의 devlog에 임시글로 올린다. "
                            + "본문은 한국어 Markdown으로, '## 오늘 한 일', '## 문제와 해결', '## 배운 점', '## 다음에 할 일' 순서를 권장한다. "
                            + "비밀번호·토큰·개인 정보·회사 내부 주소는 넣지 않는다. 공개되지 않으며, 사용자가 devlog에서 읽고 직접 발행한다.",
                    true, DRAFT_SCHEMA),
            new Tool("create_draft", "임시글 만들기",
                    "사용자의 devlog에 새 임시글을 만든다. 공개되지 않으며 사용자가 화면에서 직접 발행한다.", true, DRAFT_SCHEMA),
            new Tool("update_draft", "임시글 고치기",
                    "사용자의 임시글(아직 발행하지 않은 글)의 제목이나 본문을 바꾼다. 발행한 글은 고칠 수 없다.", true, """
                    {"type":"object","properties":{
                      "post_id":{"type":"integer"},
                      "title":{"type":"string"},
                      "content_md":{"type":"string","description":"본문 전체를 이 내용으로 바꾼다"}},
                     "required":["post_id"]}"""),
            new Tool("request_publish", "발행 요청하기",
                    "임시글을 '발행 대기'로 표시하고 편집 화면 링크를 돌려준다. 실제 발행은 사용자가 그 화면에서 [발행하기]를 눌러야 된다.",
                    true, """
                    {"type":"object","properties":{"post_id":{"type":"integer"}},"required":["post_id"]}"""),
            new Tool("search_posts", "글 검색",
                    "devlog의 공개 글을 검색한다. mine=true면 사용자 본인의 공개 글만 찾는다.", false, """
                    {"type":"object","properties":{
                      "query":{"type":"string","description":"검색어"},
                      "mine":{"type":"boolean","description":"내 글에서만 찾기"}},
                     "required":["query"]}"""),
            new Tool("get_post", "글 읽기",
                    "글 번호로 제목과 본문 Markdown을 읽는다. 사용자가 웹에서 볼 수 있는 글만 읽을 수 있다(본인 글은 임시글 포함).", false, """
                    {"type":"object","properties":{"post_id":{"type":"integer"}},"required":["post_id"]}"""),
            new Tool("list_my_posts", "내 글 목록",
                    "사용자의 임시글 또는 발행한 글 목록(최근 수정 순, 최대 20개)을 돌려준다.", false, """
                    {"type":"object","properties":{"status":{"type":"string","enum":["drafts","published"],"default":"drafts"}}}"""),
            new Tool("list_tags", "태그 보기",
                    "사용자가 자주 쓴 태그와 devlog 인기 태그를 돌려준다. 태그를 제안할 때 이 목록의 표기를 따르면 좋다.", false, """
                    {"type":"object","properties":{}}"""));

    private final JsonMapper json = JsonMapper.builder().build();
    private final PostCommandService commands;
    private final PostEditorQuery editor;
    private final MyPostsQuery myPosts;
    private final SearchQuery search;
    private final PostDetailQuery details;
    private final TagQuery tags;
    private final AiDraftHints hints;
    private final RateLimiter rateLimiter;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final String baseUrl;
    private final int maxTags;

    public McpTools(PostCommandService commands, PostEditorQuery editor, MyPostsQuery myPosts, SearchQuery search,
                    PostDetailQuery details, TagQuery tags, AiDraftHints hints, RateLimiter rateLimiter, JdbcTemplate jdbc,
                    Clock clock, BlogProperties props) {
        this.commands = commands;
        this.editor = editor;
        this.myPosts = myPosts;
        this.search = search;
        this.details = details;
        this.tags = tags;
        this.hints = hints;
        this.rateLimiter = rateLimiter;
        this.jdbc = jdbc;
        this.clock = clock;
        this.baseUrl = props.site().baseUrl();
        this.maxTags = props.post().maxTags();
    }

    /** tools/list 응답의 tools 배열 */
    public List<Map<String, Object>> definitions() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Tool t : TOOLS) {
            out.add(Map.of("name", t.name(), "title", t.title(), "description", t.description(),
                    "inputSchema", json.readTree(t.inputSchema()),
                    "annotations", Map.of("readOnlyHint", !t.write(), "destructiveHint", false, "openWorldHint", false)));
        }
        return out;
    }

    public Result call(AccessTokens.Caller caller, String name, JsonNode args) {
        Optional<Tool> tool = TOOLS.stream().filter(t -> t.name().equals(name)).findFirst();
        if (tool.isEmpty()) return Result.fail("없는 도구예요: " + name);
        if (!rateLimiter.tryAcquire("mcp:" + caller.memberId(), CALLS_PER_MINUTE, Duration.ofMinutes(1))) {
            return Result.fail("요청이 너무 많아요. 1분 뒤에 다시 시도해 주세요.");
        }
        if (tool.get().write()) {
            if (!caller.canWrite()) return Result.fail("이 토큰은 읽기 전용이에요. devlog 설정 › AI 연결에서 쓰기 권한 토큰을 만들어 주세요.");
            if (!caller.emailVerified()) return Result.fail("이메일 인증을 마친 뒤 글을 쓸 수 있어요. devlog에서 인증 메일을 확인해 주세요.");
            if (!rateLimiter.tryAcquire("mcp-write:" + caller.memberId(), WRITES_PER_HOUR, Duration.ofHours(1))) {
                return Result.fail("글쓰기 요청은 한 시간에 " + WRITES_PER_HOUR + "번까지예요. 잠시 뒤 다시 시도해 주세요.");
            }
        }
        JsonNode a = args == null || args.isNull() ? json.createObjectNode() : args;
        try {
            return switch (name) {
                case "write_devlog", "create_draft" -> createDraft(caller, a);
                case "update_draft" -> updateDraft(caller, a);
                case "request_publish" -> requestPublish(caller, a);
                case "search_posts" -> searchPosts(caller, a);
                case "get_post" -> getPost(caller, a);
                case "list_my_posts" -> listMyPosts(caller, a);
                case "list_tags" -> listTags(caller);
                default -> Result.fail("없는 도구예요: " + name);
            };
        } catch (ApiException e) {
            return Result.fail(message(e));
        }
    }

    private Result createDraft(AccessTokens.Caller caller, JsonNode a) {
        String title = text(a, "title");
        String content = text(a, "content_md");
        if (title.isBlank() || content.isBlank()) return Result.fail("제목(title)과 본문(content_md)이 필요해요.");
        List<String> suggested = tags(a);
        long id = commands.create(caller.memberId(), title, content).id();
        if (!suggested.isEmpty()) hints.suggestTags(id, suggested);
        return Result.ok("devlog에 임시글을 만들었어요 (글 번호 " + id + ").\n"
                + "아직 공개되지 않았어요. 사용자에게 이 링크에서 읽어 보고 발행하라고 알려 주세요: " + editUrl(id)
                + (suggested.isEmpty() ? "" : "\n제안한 태그: " + String.join(", ", suggested)));
    }

    private Result updateDraft(AccessTokens.Caller caller, JsonNode a) {
        long id = postId(a);
        PostEditorQuery.EditorView view = editor.open(caller.memberId(), caller.handle(), id);
        if (view.status() != PostStatus.DRAFT) return Result.fail("발행한 글은 AI가 고칠 수 없어요. devlog 화면에서 고쳐 주세요.");
        String title = a.has("title") ? text(a, "title") : view.title();
        String content = a.has("content_md") ? text(a, "content_md") : view.contentMd();
        commands.save(caller.memberId(), id, title, content, view.version());
        return Result.ok("임시글 " + id + "번을 고쳤어요. 확인 링크: " + editUrl(id));
    }

    private Result requestPublish(AccessTokens.Caller caller, JsonNode a) {
        long id = postId(a);
        PostEditorQuery.EditorView view = editor.open(caller.memberId(), caller.handle(), id);
        if (view.status() != PostStatus.DRAFT) return Result.fail("이미 발행한 글이에요: " + baseUrl + view.url());
        if (view.title().isBlank() || view.contentMd().isBlank()) return Result.fail("제목과 본문이 있어야 발행을 요청할 수 있어요.");
        hints.requestPublish(id, Times.now(clock));
        return Result.ok("'" + view.title() + "'을(를) 발행 대기로 표시했어요. 아직 공개되지 않았어요.\n"
                + "사용자가 이 화면에서 내용을 확인하고 [발행하기]를 눌러야 공개돼요: " + editUrl(id));
    }

    private Result searchPosts(AccessTokens.Caller caller, JsonNode a) {
        String query = text(a, "query");
        boolean mine = a.path("mine").asBoolean(false);
        SearchQuery.PostPage page = search.posts(query, SearchQuery.Sort.RELEVANCE, null, mine ? caller.memberId() : null);
        if ("TOO_SHORT".equals(page.notice())) return Result.fail("검색어가 너무 짧아요. 두 글자 이상으로 찾아 주세요.");
        if (page.items().isEmpty()) return Result.ok("'" + page.query() + "'로 찾은 글이 없어요.");
        StringBuilder out = new StringBuilder("'" + page.query() + "' 검색 결과 " + page.items().size() + "개:\n");
        for (SearchQuery.Hit h : page.items()) {
            out.append("- [").append(h.id()).append("] ").append(h.title()).append(" · ").append(h.author().nickname())
                    .append(" · ").append(baseUrl).append(h.url()).append('\n');
            if (h.snippetHtml() != null) out.append("  ").append(plain(h.snippetHtml())).append('\n');
        }
        return Result.ok(out.toString().stripTrailing());
    }

    private Result getPost(AccessTokens.Caller caller, JsonNode a) {
        long id = postId(a);
        Optional<PostDetailQuery.Detail> detail = details.find(id, new Viewer(caller.memberId(), false));
        if (detail.isPresent() && detail.get().mine()) {
            PostEditorQuery.EditorView view = editor.open(caller.memberId(), caller.handle(), id);
            return Result.ok("# " + view.title() + "\n\n(" + (view.status() == PostStatus.DRAFT ? "임시글" : "발행한 글 · " + baseUrl + view.url())
                    + ")\n\n" + view.contentMd());
        }
        if (detail.isEmpty()) {
            // 본인 임시글은 상세 조회에 나오지 않는다(발행 전). 편집 화면 기준으로 한 번 더 본다
            try {
                PostEditorQuery.EditorView view = editor.open(caller.memberId(), caller.handle(), id);
                return Result.ok("# " + view.title() + "\n\n(임시글)\n\n" + view.contentMd());
            } catch (ApiException e) {
                return Result.fail("글을 찾을 수 없어요 (없는 글이거나 볼 수 없는 글이에요).");
            }
        }
        PostDetailQuery.Detail d = detail.get();
        String md = jdbc.queryForObject("SELECT content_md FROM post WHERE id = ?", String.class, id);
        return Result.ok("# " + d.title() + "\n\n(" + d.author().nickname() + " · " + DATE.format(d.displayDate()) + " · " + baseUrl + d.url()
                + ")\n\n" + md);
    }

    private Result listMyPosts(AccessTokens.Caller caller, JsonNode a) {
        String status = a.path("status").asString("drafts");
        boolean published = "published".equalsIgnoreCase(status);
        MyPostsQuery.Result r = myPosts.list(caller.memberId(), published ? "published" : "drafts", null, null);
        if (r.items().isEmpty()) return Result.ok(published ? "발행한 글이 없어요." : "임시글이 없어요.");
        StringBuilder out = new StringBuilder(published ? "발행한 글:\n" : "임시글:\n");
        r.items().stream().limit(20).forEach(i -> out.append("- [").append(i.id()).append("] ")
                .append(i.title().isBlank() ? "(제목 없음)" : i.title()).append(" · 수정 ").append(DATE.format(i.updatedAt()))
                .append(i.editing() ? " · 고치는 중" : "").append('\n'));
        return Result.ok(out.toString().stripTrailing());
    }

    private Result listTags(AccessTokens.Caller caller) {
        List<String> mine = jdbc.queryForList("""
                SELECT t.name FROM post_tag pt JOIN tag t ON t.id = pt.tag_id JOIN post p ON p.id = pt.post_id
                WHERE p.author_id = ? AND p.deleted_at IS NULL GROUP BY t.name ORDER BY count(*) DESC, t.name LIMIT 30
                """, String.class, caller.memberId());
        List<String> popular = tags.top(30).stream().map(TagQuery.TagCount::name).toList();
        return Result.ok("내가 자주 쓴 태그: " + (mine.isEmpty() ? "(없음)" : String.join(", ", mine))
                + "\ndevlog 인기 태그: " + (popular.isEmpty() ? "(없음)" : String.join(", ", popular)));
    }

    private String editUrl(long id) {
        return baseUrl + "/write/" + id;
    }

    /** 표기를 태그 규칙에 맞춘다. 맞출 수 없는 태그는 버리고, 중복은 하나로, 최대 개수까지. */
    private List<String> tags(JsonNode a) {
        Set<String> out = new LinkedHashSet<>();
        for (JsonNode n : a.path("tags")) {
            if (!n.isString()) continue;
            TagNormalizer.canonical(n.asString()).ifPresent(out::add);
            if (out.size() >= maxTags) break;
        }
        return List.copyOf(out);
    }

    private static long postId(JsonNode a) {
        JsonNode n = a.path("post_id");
        if (!n.canConvertToLong() || n.asLong() <= 0) throw ApiException.badRequest("INVALID_POST_ID", "글 번호(post_id)가 필요해요.");
        return n.asLong();
    }

    private static String text(JsonNode a, String field) {
        JsonNode n = a.path(field);
        return n.isString() ? n.asString() : "";
    }

    private static String plain(String html) {
        return html.replaceAll("<[^>]{0,20}>", "").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"")
                .replace("&#39;", "'").replace("&amp;", "&");
    }

    private static String message(ApiException e) {
        if (e.status().value() == 404) return "글을 찾을 수 없어요 (없는 글이거나 내 글이 아니에요).";
        if (!e.errors().isEmpty()) return e.errors().stream().map(f -> f.message()).distinct().reduce((x, y) -> x + " " + y).orElse(e.getMessage());
        if ("VERSION_CONFLICT".equals(e.code())) return "그 사이 사용자가 글을 고쳤어요. get_post로 다시 읽은 뒤 고쳐 주세요.";
        return e.getMessage();
    }
}
