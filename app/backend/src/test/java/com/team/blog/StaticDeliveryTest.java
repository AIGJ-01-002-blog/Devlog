package com.team.blog;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import com.team.blog.support.IntegrationTest;

/** 030: 해시 붙은 화면 파일은 오래 캐시하고, 큰 텍스트 응답은 압축한다. 압축은 실제 Tomcat에서만 일어나 포트를 연다. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StaticDeliveryTest extends IntegrationTest {
    @LocalServerPort int port;
    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<byte[]> get(String path, boolean gzip) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
        if (gzip) b.header("Accept-Encoding", "gzip");
        return http.send(b.build(), HttpResponse.BodyHandlers.ofByteArray());
    }

    @Test
    void 해시_붙은_화면_파일은_1년_동안_다시_묻지_않는다() throws Exception {
        HttpResponse<byte[]> r = get("/assets/probe-T3st1234.js", false);
        assertThat(r.statusCode()).isEqualTo(200);
        String cc = r.headers().firstValue("Cache-Control").orElse("");
        assertThat(cc).contains("max-age=31536000").contains("public").contains("immutable").doesNotContain("no-store");
    }

    @Test
    void 없는_화면_파일은_캐시하지_않는다() throws Exception {
        HttpResponse<byte[]> r = get("/assets/missing-Abcd1234.js", false);
        assertThat(r.statusCode()).isEqualTo(404);
        assertThat(r.headers().firstValue("Cache-Control").orElse("")).doesNotContain("immutable");
    }

    @Test
    void 큰_텍스트_응답은_gzip으로_보낸다() throws Exception {
        HttpResponse<byte[]> plain = get("/assets/probe-T3st1234.js", false);
        HttpResponse<byte[]> gz = get("/assets/probe-T3st1234.js", true);
        assertThat(gz.headers().firstValue("Content-Encoding")).contains("gzip");
        assertThat(gz.body().length).isLessThan(plain.body().length);
        assertThat(plain.headers().firstValue("Content-Encoding")).isEmpty();
    }
}
