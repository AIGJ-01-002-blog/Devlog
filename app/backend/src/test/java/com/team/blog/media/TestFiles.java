package com.team.blog.media;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/** 첨부 테스트용 작은 파일들. */
final class TestFiles {
    private TestFiles() {}

    static byte[] pdf() {
        return "%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n".getBytes(StandardCharsets.US_ASCII);
    }

    static byte[] zip(String... names) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream z = new ZipOutputStream(out)) {
            for (String n : names) {
                z.putNextEntry(new ZipEntry(n));
                z.write(("내용 " + n).getBytes(StandardCharsets.UTF_8));
                z.closeEntry();
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }

    static byte[] docx() {
        return zip("[Content_Types].xml", "_rels/.rels", "word/document.xml");
    }
}
