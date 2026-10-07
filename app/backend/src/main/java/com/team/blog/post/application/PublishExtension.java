package com.team.blog.post.application;

import java.util.List;

import com.team.blog.post.domain.Post;
import com.team.blog.shared.markdown.RenderedContent;

/**
 * 발행 트랜잭션 안에서 덧붙는 처리 (docs/05 §7 ⑤⑥). 태그(010)·사진 연결(009)이 이 확장으로 붙는다.
 * 발행 서비스는 확장 목록만 알고 각 기능을 몰라도 된다 (헌법 IV: 기존 코드 수정 없이 기능 추가).
 */
public interface PublishExtension {
    /** 검증 단계에서 오류를 더한다 (트랜잭션 밖, 렌더링 전). */
    default void validate(PublishCommand command, List<com.team.blog.shared.error.FieldErrorItem> errors) {}

    /** post가 발행 상태로 바뀐 뒤, 같은 트랜잭션 안에서 부른다. */
    void onPublish(Post post, RenderedContent rendered, PublishCommand command);
}
