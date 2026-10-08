package com.team.blog.ai.application;

import java.time.Duration;
import java.time.ZoneId;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * AI 태그 추천 설정 (018 FR-014·FR-021·FR-027, A-4). 열쇠값·주소가 비어 있는 공급자는 쓰지 않고, 둘 다 비어 있으면 기능이 꺼진다.
 *
 * @param enabled         기능 스위치. 끄면 버튼을 숨기고 요청은 AI_UNAVAILABLE
 * @param userDailyLimit  사용자당 하루(한국 0시 기준) 실제 AI 호출 수
 * @param minChars        정리한 본문이 이보다 짧으면 부르지 않는다
 * @param cooldown        외부 AI 시간 초과·서버 오류·분당 한도 뒤 쉬는 시간
 * @param exactKeep       같은 내용 결과 보관 기간
 * @param similarKeep     같은 글 결과 보관 기간
 * @param similarity      같은 글로 볼 3글자 단위 유사도
 * @param prefer          먼저 쓸 공급자. local = 집 PC Ollama가 켜져 있으면 먼저(2026-10-08 민서님 답 4번 변경), gemini = 외부 AI 먼저
 */
@ConfigurationProperties("blog.ai")
public record AiProperties(@DefaultValue("true") boolean enabled,
                           @DefaultValue("20") int userDailyLimit,
                           @DefaultValue("100") int minChars,
                           @DefaultValue("60s") Duration cooldown,
                           @DefaultValue("30d") Duration exactKeep,
                           @DefaultValue("7d") Duration similarKeep,
                           @DefaultValue("0.9") double similarity,
                           @DefaultValue("local") String prefer,
                           @DefaultValue Gemini gemini,
                           @DefaultValue Local local) {

    /**
     * 외부 AI (Gemini 무료 등급).
     * @param resetZone 무료 등급 하루 한도가 초기화되는 시간대 (FR-017)
     */
    public record Gemini(@DefaultValue("") String apiKey,
                         @DefaultValue("https://generativelanguage.googleapis.com") String baseUrl,
                         @DefaultValue("gemini-2.5-flash-lite") String model,
                         @DefaultValue("450") int dailyLimit,
                         @DefaultValue("10s") Duration timeout,
                         @DefaultValue("8000") int maxChars,
                         @DefaultValue("America/Los_Angeles") ZoneId resetZone) {
        public boolean configured() {
            return apiKey != null && !apiKey.isBlank();
        }

        /** 열쇠값이 로그·오류 화면에 찍히지 않게 한다 (FR-033). */
        @Override
        public String toString() {
            return "Gemini[model=" + model + ", configured=" + configured() + "]";
        }
    }

    /**
     * 자체 AI (Ollama). 집 PC(12GB GPU)를 Cloudflare Tunnel로 열 때는 주소를 터널 주소로 두고, 그냥 열지 않도록
     * 접근 토큰을 함께 보낸다: authToken은 Authorization: Bearer(토큰을 확인하는 프록시 뒤), accessClientId·Secret은
     * Cloudflare Access 서비스 토큰 헤더. 셋 다 실행 환경 비밀값으로만 넣는다.
     * @param downFor 연결 실패·시간 초과 뒤 자체 AI를 건너뛰는 시간 (집 PC가 꺼졌을 때 매번 기다리지 않게)
     */
    public record Local(@DefaultValue("") String baseUrl,
                        @DefaultValue("qwen2.5:3b") String model,
                        @DefaultValue("30s") Duration timeout,
                        @DefaultValue("2000") int maxChars,
                        @DefaultValue("1") int concurrency,
                        @DefaultValue("") String authToken,
                        @DefaultValue("") String accessClientId,
                        @DefaultValue("") String accessClientSecret,
                        @DefaultValue("60s") Duration downFor) {
        public boolean configured() {
            return baseUrl != null && !baseUrl.isBlank();
        }

        /** 요청에 붙일 접근 헤더 */
        public java.util.Map<String, String> authHeaders() {
            java.util.Map<String, String> h = new java.util.LinkedHashMap<>();
            if (authToken != null && !authToken.isBlank()) h.put("Authorization", "Bearer " + authToken);
            if (accessClientId != null && !accessClientId.isBlank() && accessClientSecret != null && !accessClientSecret.isBlank()) {
                h.put("CF-Access-Client-Id", accessClientId);
                h.put("CF-Access-Client-Secret", accessClientSecret);
            }
            return h;
        }

        /** 토큰이 로그·오류 화면에 찍히지 않게 한다 */
        @Override
        public String toString() {
            return "Local[model=" + model + ", configured=" + configured() + ", auth=" + !authHeaders().isEmpty() + "]";
        }
    }

    /** 집 PC(자체 AI)를 먼저 쓰는지 */
    public boolean preferLocal() {
        return !"gemini".equalsIgnoreCase(prefer) && local.configured();
    }

    public boolean available() {
        return enabled && (gemini.configured() || local.configured());
    }
}
