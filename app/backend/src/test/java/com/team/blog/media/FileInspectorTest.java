package com.team.blog.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;

import com.team.blog.shared.error.ApiException;
import com.team.blog.support.TestImages;

class FileInspectorTest {
    @Test
    void 확장자와_내용이_맞아야_받는다() {
        assertThat(FileInspector.check("pdf", TestFiles.pdf())).isEqualTo(FileInspector.Result.OK);
        assertThat(FileInspector.check("zip", TestFiles.zip("a.txt"))).isEqualTo(FileInspector.Result.OK);
        assertThat(FileInspector.check("docx", TestFiles.docx())).isEqualTo(FileInspector.Result.OK);
        assertThat(FileInspector.check("md", "# 제목\n본문".getBytes(StandardCharsets.UTF_8))).isEqualTo(FileInspector.Result.OK);
        assertThat(FileInspector.check("csv", "a,b\n1,2".getBytes(StandardCharsets.UTF_8))).isEqualTo(FileInspector.Result.OK);
    }

    @Test
    void 이름만_바꾼_파일과_목록_밖_형식과_사진은_거부한다() {
        assertThat(FileInspector.check("pdf", TestFiles.zip("a.txt"))).isEqualTo(FileInspector.Result.MISMATCH);
        assertThat(FileInspector.check("docx", TestFiles.zip("a.txt"))).isEqualTo(FileInspector.Result.MISMATCH);
        assertThat(FileInspector.check("xlsx", TestFiles.docx())).isEqualTo(FileInspector.Result.MISMATCH);
        assertThat(FileInspector.check("txt", new byte[] {'M', 'Z', 0, 1})).isEqualTo(FileInspector.Result.MISMATCH);
        assertThat(FileInspector.check("txt", new byte[] {'a', 0, 'b'})).isEqualTo(FileInspector.Result.MISMATCH);
        assertThat(FileInspector.check("exe", new byte[] {'M', 'Z'})).isEqualTo(FileInspector.Result.NOT_ALLOWED);
        assertThat(FileInspector.check(null, "글".getBytes(StandardCharsets.UTF_8))).isEqualTo(FileInspector.Result.NOT_ALLOWED);
        assertThat(FileInspector.check("pdf", TestImages.png(4, 4))).isEqualTo(FileInspector.Result.IMAGE);
    }

    @Test
    void 깨진_압축은_문서로_보지_않는다() {
        byte[] z = TestFiles.docx();
        byte[] cut = java.util.Arrays.copyOf(z, z.length - 10);
        assertThat(FileInspector.check("docx", cut)).isEqualTo(FileInspector.Result.MISMATCH);
    }

    @Test
    void 이름은_경로와_제어_문자를_지우고_확장자를_살려_줄인다() {
        assertThat(PostFiles.cleanName("C:\\Users\\me\\보고서.pdf")).isEqualTo("보고서.pdf");
        assertThat(PostFiles.cleanName("../../etc/a\u0000b\u202E.txt")).isEqualTo("ab.txt");
        assertThat(PostFiles.cleanName("...hidden.md")).isEqualTo("hidden.md");
        String longName = PostFiles.cleanName("가".repeat(300) + ".pdf");
        assertThat(longName).endsWith(".pdf").hasSize(255);
        assertThatThrownBy(() -> PostFiles.cleanName(" / ")).isInstanceOf(ApiException.class);
    }
}
