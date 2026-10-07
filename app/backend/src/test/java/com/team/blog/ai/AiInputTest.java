package com.team.blog.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.team.blog.ai.application.AiInput;
import com.team.blog.ai.application.TagModel;
import com.team.blog.ai.application.TagPrompt;

class AiInputTest {
    @Test
    void 서식을_빼고_글자만_남긴다() {
        String md = """
                ## 제목 **굵게** _기울임_ ~~취소~~
                > 인용
                1. 첫째 [링크 글자](https://a.example) `inline`
                - [x] 할 일
                ![사진](https://img.example/p.png)<img src="x">
                ---
                ```python
                1
                2
                3
                4
                5
                6
                ```
                끝  Java""";
        assertThat(AiInput.clean(" 글  제목 ", md))
                .isEqualTo(new AiInput.Cleaned("글 제목", "제목 굵게 기울임 취소 인용 첫째 링크 글자 inline 할 일 python 1 2 3 4 5 끝 Java"));
    }

    @Test
    void 공급자_최대_길이로_자르고_식별값은_공백_차이를_무시한다() {
        AiInput.Cleaned a = AiInput.clean("t", "가".repeat(3000));
        assertThat(a.bodyUpTo(2000)).hasSize(2000);
        assertThat(a.truncatedAt(2000)).isTrue();
        assertThat(a.truncatedAt(8000)).isFalse();
        assertThat(AiInput.key(AiInput.clean("t", "a  b\n\nc"), 8000)).isEqualTo(AiInput.key(AiInput.clean("t", "a b c"), 8000));
        assertThat(AiInput.key(AiInput.clean("t", "a b c"), 8000)).isNotEqualTo(AiInput.key(AiInput.clean("u", "a b c"), 8000));
    }

    @Test
    void 세_글자_유사도() {
        String text = "스프링 부트로 REST API를 만들고 PostgreSQL에 저장하는 과정을 정리했습니다. ".repeat(5);
        assertThat(AiInput.similarity(text, text)).isEqualTo(1.0);
        assertThat(AiInput.similarity(text, text.replaceFirst("정리", "졍리"))).isGreaterThanOrEqualTo(0.9);
        assertThat(AiInput.similarity(text, "코틀린 코루틴과 Flow로 비동기 코드를 짜는 방법")).isLessThan(0.3);
    }

    @Test
    void 응답_형식_검사() throws Exception {
        assertThat(TagPrompt.parse("{\"tags\":[\"a\",\"b\"]}")).containsExactly("a", "b");
        assertThat(TagPrompt.parse("```json\n{\"tags\":[]}\n```")).isEmpty();
        for (String bad : List.of("", "[\"a\"]", "{\"tags\":\"a\"}", "{\"tags\":[1]}", "{\"tags\":[\"1\",\"2\",\"3\",\"4\",\"5\",\"6\"]}")) {
            try {
                TagPrompt.parse(bad);
                throw new AssertionError(bad);
            } catch (TagModel.ModelException e) {
                assertThat(e.kind()).isEqualTo(TagModel.ModelException.Kind.INVALID);
            }
        }
        assertThat(TagPrompt.mentioned(List.of("spring-boot", "react", "java"), "Spring Boot", "java 이야기"))
                .containsExactly("spring-boot", "java");
    }
}
