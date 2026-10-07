package com.team.blog.shared.error;

import org.springframework.http.HttpStatus;

/**
 * 없음·볼 수 없음·내 것이 아님을 모두 같은 404로 돌려준다 (헌법 II, docs/42 P-4).
 * 메시지를 세분화하지 않아 외부에서 둘을 구별할 수 없다.
 */
public class NotFoundException extends ApiException {
    public static final String MESSAGE = "볼 수 없는 페이지예요.";

    public NotFoundException() {
        super(HttpStatus.NOT_FOUND, "NOT_FOUND", MESSAGE);
    }
}
