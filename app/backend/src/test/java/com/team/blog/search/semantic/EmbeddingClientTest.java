package com.team.blog.search.semantic;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.team.blog.search.semantic.EmbeddingClient.Provider;

/** 공급자 고르기와 pgvector 표기 (054). */
class EmbeddingClientTest {

    @Test
    void auto는_Ollama_다음_Gemini_순으로_고르고_꺼져_있으면_없음() {
        assertThat(EmbeddingClient.choose("auto", true, true, true)).isEqualTo(Provider.LOCAL);
        assertThat(EmbeddingClient.choose("auto", false, true, true)).isEqualTo(Provider.GEMINI);
        assertThat(EmbeddingClient.choose("auto", false, false, true)).isEqualTo(Provider.NONE);
        assertThat(EmbeddingClient.choose("gemini", true, true, true)).isEqualTo(Provider.GEMINI);
        assertThat(EmbeddingClient.choose("local", false, true, true)).isEqualTo(Provider.NONE);
        assertThat(EmbeddingClient.choose("auto", true, true, false)).isEqualTo(Provider.NONE);
    }

    @Test
    void 벡터_표기() {
        assertThat(EmbeddingClient.literal(new float[] {1f, -0.5f, 0f})).isEqualTo("[1.0,-0.5,0.0]");
    }
}
