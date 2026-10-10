package com.team.blog.account.infra.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.team.blog.support.TestImages;

/** spec 080 FR-012: 서버가 소셜 사진을 대신 받을 때 허용된 사진 서버의 https 주소만, 사진만 돌려준다. */
class SocialAvatarRelayTest {
    final List<URI> requested = new ArrayList<>();

    SocialAvatarRelay relay(Optional<byte[]> body) {
        return new SocialAvatarRelay(uri -> {
            requested.add(uri);
            return body;
        });
    }

    @Test
    void 카카오_사진_서버의_사진을_받아_실제_형식과_함께_돌려준다() {
        byte[] png = TestImages.png(640, 640);
        Optional<SocialAvatarRelay.Image> image = relay(Optional.of(png)).fetch("https://k.kakaocdn.net/dn/abc/img_640x640.jpg");
        assertThat(image).isPresent();
        assertThat(image.get().contentType()).isEqualTo("image/png");
        assertThat(image.get().data()).isEqualTo(png);
        assertThat(requested).containsExactly(URI.create("https://k.kakaocdn.net/dn/abc/img_640x640.jpg"));
    }

    @Test
    void 허용되지_않은_곳이나_https가_아닌_주소는_요청하지_않는다() {
        SocialAvatarRelay r = relay(Optional.of(TestImages.png(64, 64)));
        assertThat(r.fetch("https://example.com/a.png")).isEmpty();
        assertThat(r.fetch("http://k.kakaocdn.net/dn/a.jpg")).isEmpty();
        assertThat(r.fetch("https://k.kakaocdn.net:8443/dn/a.jpg")).isEmpty();
        assertThat(r.fetch("https://user@k.kakaocdn.net/dn/a.jpg")).isEmpty();
        assertThat(r.fetch(null)).isEmpty();
        assertThat(requested).isEmpty();
    }

    @Test
    void 사진이_아니거나_받지_못하면_빈_값() {
        assertThat(relay(Optional.of("<html>nope</html>".getBytes())).fetch("https://k.kakaocdn.net/dn/a.jpg")).isEmpty();
        assertThat(relay(Optional.empty()).fetch("https://k.kakaocdn.net/dn/a.jpg")).isEmpty();
        assertThat(new SocialAvatarRelay(uri -> { throw new IOException("reset"); }).fetch("https://k.kakaocdn.net/dn/a.jpg")).isEmpty();
    }
}
