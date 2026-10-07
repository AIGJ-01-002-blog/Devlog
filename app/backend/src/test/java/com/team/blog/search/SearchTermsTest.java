package com.team.blog.search;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.team.blog.search.application.SearchTerms;
import com.team.blog.search.application.Snippet;

/** 검색어 처리(FR-005~FR-009)와 결과 문장(FR-018·FR-019) 단위 시험. */
class SearchTermsTest {

    @Test
    void 정규화_자르기_단어_수() {
        // 조합형 한글(NFD)도 완성형으로 맞춘다
        String nfd = java.text.Normalizer.normalize("트랜잭션", java.text.Normalizer.Form.NFD);
        SearchTerms t = SearchTerms.parse("  " + nfd + "   정리 a  ");
        assertThat(t.words()).containsExactly("트랜잭션", "정리");
        assertThat(t.normalized()).isEqualTo("트랜잭션 정리 a");
        assertThat(t.hasShortWord()).isTrue();
        assertThat(t.hasBodyWord()).isTrue();
        assertThat(t.longest()).isEqualTo("트랜잭션");

        assertThat(SearchTerms.parse("aa bb cc dd ee ff gg").words()).containsExactly("aa", "bb", "cc", "dd", "ee");
        assertThat(SearchTerms.parse("가".repeat(60)).words().get(0)).hasSize(50);
        assertThat(SearchTerms.parse("같은말 같은말").words()).containsExactly("같은말");
        assertThat(SearchTerms.parse(null).isEmpty()).isTrue();
        // 다른 검색은 다른 커서 목록
        assertThat(SearchTerms.parse("자바 스프링").fingerprint()).isNotEqualTo(SearchTerms.parse("자바 스프링부트").fingerprint())
                .isEqualTo(SearchTerms.parse("자바  스프링").fingerprint());
    }

    @Test
    void 특수기호는_글자_그대로() {
        assertThat(SearchTerms.likePattern("100%")).isEqualTo("%100\\%%");
        assertThat(SearchTerms.likePattern("snake_case")).isEqualTo("%snake\\_case%");
        assertThat(SearchTerms.likePattern("a\\b")).isEqualTo("%a\\\\b%");
    }

    @Test
    void 결과_문장은_검색어만_강조한다() {
        SearchTerms t = SearchTerms.parse("amp lt");
        String html = Snippet.of("A & B <lt> amp", "제목", t.highlightPattern());
        // 이스케이프한 &amp;·&lt; 안의 글자에는 강조가 붙지 않는다
        assertThat(html).isEqualTo("A &amp; B &lt;<mark>lt</mark>&gt; <mark>amp</mark>");

        assertThat(Snippet.of("본문", "자바 amp 정리", t.highlightPattern())).isEqualTo("자바 <mark>amp</mark> 정리");
        assertThat(Snippet.of("검색어 없는 본문", "제목", t.highlightPattern())).isEqualTo("검색어 없는 본문");
        assertThat(Snippet.of("", "제목", t.highlightPattern())).isNull();

        String longText = "가".repeat(100) + "AMP" + "나".repeat(100);
        String cut = Snippet.of(longText, "", t.highlightPattern());
        assertThat(cut).isEqualTo("…" + "가".repeat(40) + "<mark>AMP</mark>" + "나".repeat(40) + "…");
        // 이모지를 반으로 자르지 않는다
        String emoji = "😀".repeat(50) + "amp";
        assertThat(Snippet.of(emoji, "", t.highlightPattern())).isEqualTo("…" + "😀".repeat(40) + "<mark>amp</mark>");
    }
}
