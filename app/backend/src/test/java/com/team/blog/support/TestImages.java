package com.team.blog.support;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

import javax.imageio.ImageIO;

/** 테스트용 사진 바이트. 실제 인코더(ImageIO)로 만들어 머리 읽기를 진짜 파일로 확인한다. */
public final class TestImages {
    private TestImages() {}

    public static byte[] png(int w, int h) {
        return encode("png", w, h);
    }

    public static byte[] jpeg(int w, int h) {
        return encode("jpg", w, h);
    }

    public static byte[] gif(int w, int h) {
        return encode("gif", w, h);
    }

    /** 여러 장면 GIF (ImageIO 연속 쓰기). */
    public static byte[] animatedGif(int w, int h, int frames) {
        try {
            var writer = ImageIO.getImageWritersByFormatName("gif").next();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (var ios = ImageIO.createImageOutputStream(out)) {
                writer.setOutput(ios);
                writer.prepareWriteSequence(null);
                for (int i = 0; i < frames; i++) {
                    BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
                    var g = img.createGraphics();
                    g.setColor(new Color((i * 37) % 256, 80, 160));
                    g.fillRect(0, 0, w, h);
                    g.dispose();
                    writer.writeToSequence(new javax.imageio.IIOImage(img, null, null), null);
                }
                writer.endWriteSequence();
            }
            writer.dispose();
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** SOI 바로 뒤에 EXIF(APP1) 구간을 끼워 넣은 JPEG: 촬영 위치 같은 사진 정보가 남은 파일. */
    public static byte[] jpegWithExif(int w, int h) {
        byte[] jpeg = jpeg(w, h);
        byte[] payload = "Exif\0\0GPS-DATA".getBytes(StandardCharsets.ISO_8859_1);
        int len = payload.length + 2;
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(jpeg, 0, 2);
        out.write(0xFF);
        out.write(0xE1);
        out.write(len >> 8);
        out.write(len & 0xFF);
        out.write(payload, 0, payload.length);
        out.write(jpeg, 2, jpeg.length - 2);
        return out.toByteArray();
    }

    private static byte[] encode(String format, int w, int h) {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        var g = img.createGraphics();
        g.setColor(new Color(40, 120, 200));
        g.fillRect(0, 0, w, h);
        g.setColor(Color.WHITE);
        g.fillOval(w / 4, h / 4, w / 2, h / 2);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            if (!ImageIO.write(img, format, out)) throw new IllegalStateException("인코더 없음: " + format);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }
}
