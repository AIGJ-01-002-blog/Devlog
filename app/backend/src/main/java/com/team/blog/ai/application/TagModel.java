package com.team.blog.ai.application;

import java.util.List;

/** 태그를 만들어 주는 AI 공급자 하나 (018 FR-014). 글 내용·열쇠값은 로그에 남기지 않는다(FR-033). */
public interface TagModel {
    Provider provider();

    boolean configured();

    /** 공급자 최대 입력 글자 수 */
    int maxChars();

    /** @return 형식 검사를 통과한 원래 태그 목록(최대 5개). 정규화·걸러내기는 부르는 쪽이 한다. */
    List<String> suggest(Prompt prompt) throws ModelException;

    enum Provider { GEMINI, LOCAL }

    /** 고정 지시문을 앞에, 매번 다른 내용을 뒤에 둔다 (FR-010). */
    record Prompt(String system, String user) {}

    /** 공급자 응답 분류 (FR-016). */
    final class ModelException extends Exception {
        public enum Kind {
            /** 하루 한도 초과 */
            DAILY_QUOTA,
            /** 분당 한도 초과 */
            MINUTE_QUOTA,
            /** 종류를 모르는 한도 초과 */
            UNKNOWN_QUOTA,
            /** 시간 초과·서버 오류·연결 실패 */
            FAILURE,
            /** 형식에 맞지 않는 응답 */
            INVALID
        }

        private final Kind kind;

        public ModelException(Kind kind) {
            super(kind.name(), null, false, false);
            this.kind = kind;
        }

        public Kind kind() {
            return kind;
        }

        public boolean quota() {
            return kind == Kind.DAILY_QUOTA || kind == Kind.MINUTE_QUOTA || kind == Kind.UNKNOWN_QUOTA;
        }
    }
}
