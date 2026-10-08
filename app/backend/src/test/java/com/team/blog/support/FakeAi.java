package com.team.blog.support;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

/**
 * 테스트용 가짜 AI 공급자 (018). 한 서버가 Gemini(/v1beta/models/…:generateContent)와 Ollama(/api/chat)를 함께 흉내 낸다.
 * 응답은 테스트가 차례로 넣고, 비면 기본 응답(태그 java)이다. 받은 요청 본문을 남겨 "보내지 않았음"을 확인한다.
 */
public final class FakeAi {
    public record Reply(int status, String body) {}

    public static final FakeAi INSTANCE = start();

    private final HttpServer server;
    private final Deque<Reply> gemini = new ArrayDeque<>();
    private final Deque<Reply> local = new ArrayDeque<>();
    public final List<String> geminiRequests = new CopyOnWriteArrayList<>();
    public final List<String> geminiKeys = new CopyOnWriteArrayList<>();
    public final List<String> localRequests = new CopyOnWriteArrayList<>();
    /** 자체 AI 요청의 접근 헤더 (Authorization, CF-Access-Client-Id) */
    public final List<String> localAuth = new CopyOnWriteArrayList<>();

    private FakeAi(HttpServer server) {
        this.server = server;
    }

    private static FakeAi start() {
        try {
            HttpServer s = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            FakeAi f = new FakeAi(s);
            s.createContext("/v1beta/models/", ex -> f.handle(ex, f.gemini, f.geminiRequests, true));
            s.createContext("/api/chat", ex -> f.handle(ex, f.local, f.localRequests, false));
            s.createContext("/api/embed", f::embed);
            s.start();
            return f;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    public synchronized void reset() {
        gemini.clear();
        local.clear();
        geminiRequests.clear();
        geminiKeys.clear();
        localRequests.clear();
        localAuth.clear();
        embedRequests.clear();
        embedFailing = false;
    }

    // ── 임베딩 (054): Ollama /api/embed를 흉내 낸다 ──

    /** 받은 임베딩 요청마다 묶어 보낸 글 수 */
    public final List<Integer> embedRequests = new CopyOnWriteArrayList<>();
    /** true면 임베딩 요청에 500으로 답한다 (공급자가 꺼진 상황) */
    public volatile boolean embedFailing;

    /**
     * 뜻을 흉내 내는 작은 벡터: 같은 주제 단어끼리 같은 칸을 올린다. "롤백"과 "트랜잭션"은 글자는 달라도 가깝고,
     * "도커"와는 멀다. 마지막 칸은 0 벡터를 피하는 작은 값이다.
     */
    static final List<List<String>> TOPICS = List.of(
            List.of("트랜잭션", "롤백", "커밋", "transaction", "rollback"),
            List.of("도커", "컨테이너", "쿠버네티스", "docker", "kubernetes"),
            List.of("고양이", "강아지", "반려동물"));

    public static double[] vector(String text) {
        double[] v = new double[TOPICS.size() + 1];
        String lower = text.toLowerCase();
        for (int i = 0; i < TOPICS.size(); i++) {
            for (String w : TOPICS.get(i)) {
                int from = 0;
                while ((from = lower.indexOf(w, from)) >= 0) {
                    v[i] += 1;
                    from += w.length();
                }
            }
        }
        v[TOPICS.size()] = 0.05;
        return v;
    }

    private void embed(HttpExchange ex) throws IOException {
        String body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        if (embedFailing) {
            ex.sendResponseHeaders(500, -1);
            ex.close();
            return;
        }
        tools.jackson.databind.JsonNode input = MAPPER.readTree(body).path("input");
        embedRequests.add(input.size());
        StringBuilder out = new StringBuilder("{\"model\":\"bge-m3\",\"embeddings\":[");
        for (int i = 0; i < input.size(); i++) {
            if (i > 0) out.append(',');
            double[] v = vector(input.get(i).asString());
            out.append('[');
            for (int j = 0; j < v.length; j++) out.append(j > 0 ? "," : "").append(v[j]);
            out.append(']');
        }
        byte[] bytes = out.append("]}").toString().getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(200, bytes.length);
        ex.getResponseBody().write(bytes);
        ex.close();
    }

    private static final tools.jackson.databind.json.JsonMapper MAPPER = tools.jackson.databind.json.JsonMapper.builder().build();

    /** Gemini 성공 응답: 모델이 낸 글자(text)를 감싼다 */
    public static Reply geminiText(String text) {
        String escaped = text.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
        return new Reply(200, "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"" + escaped + "\"}]}}]}");
    }

    public static Reply localText(String text) {
        String escaped = text.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
        return new Reply(200, "{\"message\":{\"role\":\"assistant\",\"content\":\"" + escaped + "\"}}");
    }

    public synchronized void nextGemini(Reply... replies) {
        gemini.addAll(List.of(replies));
    }

    public synchronized void nextLocal(Reply... replies) {
        local.addAll(List.of(replies));
    }

    private void handle(HttpExchange ex, Deque<Reply> queue, List<String> log, boolean isGemini) throws IOException {
        String body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        log.add(body);
        if (isGemini) geminiKeys.add(String.valueOf(ex.getRequestHeaders().getFirst("x-goog-api-key")));
        else localAuth.add(ex.getRequestHeaders().getFirst("Authorization") + "|" + ex.getRequestHeaders().getFirst("CF-Access-Client-Id"));
        Reply r;
        synchronized (this) {
            r = queue.isEmpty() ? null : queue.poll();
        }
        if (r == null) r = isGemini ? geminiText("{\"tags\":[\"java\"]}") : localText("{\"tags\":[\"java\"]}");
        byte[] out = r.body().getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(r.status(), out.length);
        ex.getResponseBody().write(out);
        ex.close();
    }
}
