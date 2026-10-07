package com.team.blog.shared.web;

import org.springframework.http.HttpStatus;

import com.team.blog.shared.error.ApiException;

public class TooManyRequestsException extends ApiException {
    private final long retryAfterSeconds;

    public TooManyRequestsException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_REQUESTS", "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }

    public long retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
