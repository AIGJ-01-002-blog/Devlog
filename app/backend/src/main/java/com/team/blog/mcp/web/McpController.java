package com.team.blog.mcp.web;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import com.team.blog.mcp.application.AccessTokens;
import com.team.blog.mcp.application.McpTools;
import com.team.blog.mcp.application.OAuthServer;

/**
 * devlog MCP 서버 (052). Streamable HTTP의 상태 없는 형태: POST 한 번에 JSON-RPC 요청 하나, 응답은 JSON 하나.
 * 세션·SSE는 쓰지 않는다(서버가 먼저 보낼 일이 없다). 인증은 세션 쿠키가 아니라 접근 토큰(Bearer: 개인 토큰 또는 OAuth)만 본다.
 */
@RestController
@RequestMapping(McpController.PATH)
public class McpController {
    public static final String PATH = "/api/mcp";
    static final List<String> PROTOCOL_VERSIONS = List.of("2025-11-25", "2025-06-18", "2025-03-26");
    private static final String INSTRUCTIONS = """
            devlog는 개발 블로그예요. 사용자가 개발 일지를 남겨 달라고 하거나 작업을 마무리할 때 write_devlog로 \
            오늘 한 일을 정리해 임시글로 올려 주세요. 글은 공개되지 않고, 사용자가 devlog 화면에서 읽고 직접 발행해요. \
            비밀번호·토큰·개인 정보·회사 내부 주소는 글에 넣지 마세요. \
            사용자가 예전 글을 이어 쓰거나 고치자고 하면 search_posts(mine=true)로 찾고 get_post로 읽은 뒤 update_draft로 고쳐 주세요. \
            발행한 글을 고치면 작업본에만 저장되고, 사용자가 다시 발행해야 공개돼요. \
            본문에 스크린샷이나 그림이 필요하면 upload_image나 create_image_upload_link로 올린 뒤 돌려받은 Markdown을 본문에 넣어 주세요.""";
    /** 회원이 "AI가 발행·삭제하도록 허용"을 켰을 때 덧붙인다 (053) */
    private static final String INSTRUCTIONS_AI_PUBLISH = " 이 사용자는 AI가 발행·삭제하도록 허용했어요. "
            + "publish_post·delete_post는 사용자가 발행하거나 삭제하라고 분명히 말했을 때만 쓰고, "
            + "하기 전에 어떤 글인지(글 번호·제목) 사용자에게 확인해 주세요.";

    private final AccessTokens tokens;
    private final McpTools tools;
    private final OAuthServer oauth;
    private final JsonMapper json = JsonMapper.builder().build();

    public McpController(AccessTokens tokens, McpTools tools, OAuthServer oauth) {
        this.tokens = tokens;
        this.tools = tools;
        this.oauth = oauth;
    }

    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> post(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
                                  @RequestBody(required = false) String body) {
        Optional<AccessTokens.Caller> caller = tokens.authenticate(authorization);
        if (caller.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    // OAuth 앱(ChatGPT 등)은 이 주소에서 로그인 방법을 찾는다 (RFC 9728)
                    .header(HttpHeaders.WWW_AUTHENTICATE, "Bearer realm=\"devlog\", error=\"invalid_token\", resource_metadata=\""
                            + oauth.issuer() + "/.well-known/oauth-protected-resource\"")
                    .body(error(null, -32001, "토큰이 없거나 폐기·만료됐어요. devlog 설정 › AI 연결에서 새 토큰을 만들어 주세요."));
        }
        if (!"ACTIVE".equals(caller.get().status())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error(null, -32003, "지금 계정 상태로는 AI 연결을 쓸 수 없어요."));
        }
        JsonNode req;
        try {
            req = json.readTree(body == null ? "" : body);
        } catch (JacksonException e) {
            return ok(error(null, -32700, "JSON을 읽을 수 없어요."));
        }
        if (req == null || !req.isObject() || !req.path("method").isString()) {
            // 배치(배열)는 2025-06-18부터 빠졌다
            return ok(error(null, -32600, "JSON-RPC 요청 하나를 보내 주세요."));
        }
        JsonNode id = req.get("id");
        String method = req.path("method").asString();
        if (id == null || id.isNull()) {
            // 알림(notifications/initialized 등)은 답이 없다
            return ResponseEntity.accepted().build();
        }
        JsonNode params = req.path("params");
        return switch (method) {
            case "initialize" -> ok(result(id, initialize(params, caller.get())));
            case "ping" -> ok(result(id, Map.of()));
            case "tools/list" -> ok(result(id, Map.of("tools", tools.definitions(caller.get()))));
            case "tools/call" -> {
                String name = params.path("name").asString("");
                if (name.isEmpty()) yield ok(error(id, -32602, "도구 이름(name)이 필요해요."));
                McpTools.Result r = tools.call(caller.get(), name, params.get("arguments"));
                yield ok(result(id, Map.of("content", List.of(Map.of("type", "text", "text", r.text())), "isError", r.error())));
            }
            default -> ok(error(id, -32601, "지원하지 않는 메서드예요: " + method));
        };
    }

    /** 서버가 먼저 보내는 스트림(SSE)은 없다 */
    @GetMapping
    public ResponseEntity<Void> stream() {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).header(HttpHeaders.ALLOW, "POST").build();
    }

    private Map<String, Object> initialize(JsonNode params, AccessTokens.Caller caller) {
        String asked = params.path("protocolVersion").asString("");
        String version = PROTOCOL_VERSIONS.contains(asked) ? asked : PROTOCOL_VERSIONS.getFirst();
        return Map.of("protocolVersion", version,
                "capabilities", Map.of("tools", Map.of("listChanged", false)),
                "serverInfo", Map.of("name", "devlog", "title", "devlog 개발 일지", "version", "1"),
                "instructions", caller.aiPublishAllowed() ? INSTRUCTIONS + INSTRUCTIONS_AI_PUBLISH : INSTRUCTIONS);
    }

    private static ResponseEntity<Object> ok(Object body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_JSON).body(body);
    }

    private static Map<String, Object> result(JsonNode id, Object result) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("jsonrpc", "2.0");
        out.put("id", id);
        out.put("result", result);
        return out;
    }

    private static Map<String, Object> error(JsonNode id, int code, String message) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("jsonrpc", "2.0");
        out.put("id", id);
        out.put("error", Map.of("code", code, "message", message));
        return out;
    }
}
