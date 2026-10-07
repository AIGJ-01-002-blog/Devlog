package com.team.blog.shared.markdown;

import com.team.blog.shared.error.ApiException;

public class ContentTooComplexException extends ApiException {
    public ContentTooComplexException() {
        super(org.springframework.http.HttpStatus.BAD_REQUEST, "CONTENT_TOO_COMPLEX", "글 구조가 너무 복잡해요 (목록·인용은 20단계까지)");
    }
}
