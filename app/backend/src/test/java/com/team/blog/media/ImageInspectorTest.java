package com.team.blog.media;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import org.junit.jupiter.api.Test;

import com.team.blog.support.TestImages;

class ImageInspectorTest {

    @Test
    void png_jpeg_gif의_형식과_크기를_머리에서_읽는다() {
        assertThat(ImageInspector.inspect(TestImages.png(256, 128))).hasValueSatisfying(i -> {
            assertThat(i.contentType()).isEqualTo("image/png");
            assertThat(i.width()).isEqualTo(256);
            assertThat(i.height()).isEqualTo(128);
            assertThat(i.hasMetadata()).isFalse();
        });
        assertThat(ImageInspector.inspect(TestImages.jpeg(300, 200))).hasValueSatisfying(i -> {
            assertThat(i.extension()).isEqualTo("jpg");
            assertThat(i.width()).isEqualTo(300);
            assertThat(i.height()).isEqualTo(200);
        });
        assertThat(ImageInspector.inspect(TestImages.gif(10, 20))).hasValueSatisfying(i -> {
            assertThat(i.contentType()).isEqualTo("image/gif");
            assertThat(i.height()).isEqualTo(20);
        });
    }

    @Test
    void EXIF가_남은_JPEG는_사진_정보가_있다고_알린다() {
        assertThat(ImageInspector.inspect(TestImages.jpegWithExif(256, 256))).hasValueSatisfying(i -> {
            assertThat(i.width()).isEqualTo(256);
            assertThat(i.hasMetadata()).isTrue();
        });
    }

    @Test
    void webp_세_가지_머리_모양을_모두_읽는다() {
        // VP8(손실): 프레임 머리 시작 코드 9d 01 2a 뒤에 14비트 너비·높이
        byte[] lossy = riff("VP8 ", new byte[]{0, 0, 0, 0, 0, 0, 0, (byte) 0x9D, 0x01, 0x2A, 0x00, 0x01, 0x00, 0x01, 0, 0});
        assertThat(ImageInspector.inspect(lossy)).hasValueSatisfying(i -> {
            assertThat(i.contentType()).isEqualTo("image/webp");
            assertThat(i.width()).isEqualTo(256);
            assertThat(i.height()).isEqualTo(256);
        });
        // VP8L(무손실): 0x2f 뒤 32비트에 (너비-1) 14비트, (높이-1) 14비트
        int bits = 255 | 255 << 14;
        byte[] lossless = riff("VP8L", new byte[]{0, 0, 0, 0, 0x2F, (byte) bits, (byte) (bits >> 8), (byte) (bits >> 16), (byte) (bits >> 24), 0, 0, 0});
        assertThat(ImageInspector.inspect(lossless)).hasValueSatisfying(i -> assertThat(i.width()).isEqualTo(256));
        // VP8X(확장): EXIF 깃발(0x08)이 서 있으면 사진 정보가 있다
        byte[] extended = riff("VP8X", new byte[]{0, 0, 0, 0, 0x08, 0, 0, 0, (byte) 0xFF, 0, 0, (byte) 0xFF, 0, 0, 0, 0});
        assertThat(ImageInspector.inspect(extended)).hasValueSatisfying(i -> {
            assertThat(i.height()).isEqualTo(256);
            assertThat(i.hasMetadata()).isTrue();
        });
    }

    @Test
    void 사진이_아니거나_머리가_잘린_파일은_거부한다() {
        assertThat(ImageInspector.inspect("<svg onload=alert(1)></svg>".getBytes(StandardCharsets.UTF_8))).isEmpty();
        assertThat(ImageInspector.inspect(Arrays.copyOf(TestImages.png(256, 256), 18))).isEmpty();
        assertThat(ImageInspector.inspect(Arrays.copyOf(TestImages.jpeg(256, 256), 20))).isEmpty();
        assertThat(ImageInspector.inspect(new byte[0])).isEmpty();
        assertThat(ImageInspector.inspect(null)).isEmpty();
    }

    private static byte[] riff(String chunk, byte[] body) {
        byte[] out = new byte[12 + 4 + body.length + 4];
        System.arraycopy("RIFF".getBytes(StandardCharsets.US_ASCII), 0, out, 0, 4);
        System.arraycopy("WEBP".getBytes(StandardCharsets.US_ASCII), 0, out, 8, 4);
        System.arraycopy(chunk.getBytes(StandardCharsets.US_ASCII), 0, out, 12, 4);
        System.arraycopy(body, 0, out, 16, body.length);
        return out;
    }
}
