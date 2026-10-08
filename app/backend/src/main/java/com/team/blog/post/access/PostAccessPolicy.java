package com.team.blog.post.access;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.team.blog.account.domain.Visibility;
import com.team.blog.post.domain.PostStatus;

/**
 * 글 하나를 읽을 수 있는지 판정하는 유일한 곳 (docs/06 R-1, docs/42 §3 ③).
 * 순서: 삭제 → 작성자 탈퇴 → 작성자 본인(임시·숨김·비공개 모두 봄) → 임시글 → 관리자 숨김 → 공개 범위 규칙.
 * 볼 수 없으면 호출한 쪽이 404로 응답한다 — "없음"과 "권한 없음"을 구분하지 않는다.
 */
@Component
public class PostAccessPolicy {
    private final Map<Visibility, VisibilityRule> rules = new EnumMap<>(Visibility.class);

    public PostAccessPolicy(List<VisibilityRule> rules) {
        rules.forEach(r -> this.rules.put(r.visibility(), r));
    }

    public boolean canRead(ReadablePost post, Viewer viewer) {
        if (post.deleted() || post.authorWithdrawn()) return false;
        if (viewer.is(post.authorId())) return true;
        if (post.status() != PostStatus.PUBLISHED) return false;
        if (post.hidden()) return false; // 숨긴 글은 작성자 본인에게만 (docs/43 §4-1)
        VisibilityRule rule = rules.get(post.visibility());
        return rule != null && rule.canRead(post, viewer);
    }

    /**
     * 목록에 나올 수 있는 글의 공용 조건 (docs/06 R-2·R-2a·R-2b). 공개 목록 인덱스(ix_post_feed·ix_post_blog)의 WHERE를
     * 그대로 포함해야 인덱스를 쓴다. p = post, m = member 별칭. 숨김 예외는 목록에 없다.
     */
    public static final String PUBLIC_LIST_CONDITION =
            "p.status = 'PUBLISHED' AND p.visibility = 'PUBLIC' AND p.deleted_at IS NULL AND p.hidden_at IS NULL"
                    + " AND m.withdrawn_at IS NULL";

    /**
     * 친구 공개 글까지 포함한 목록 조건 (docs/06 §6-3). ix_post_blog_friends의 WHERE를 그대로 포함한다.
     * 친구인지는 이 조건에 없다: 쓰는 쪽이 친구 관계를 확인한 뒤에만 쓴다.
     */
    public static final String FRIENDS_LIST_CONDITION =
            "p.status = 'PUBLISHED' AND p.visibility IN ('PUBLIC', 'FRIENDS') AND p.deleted_at IS NULL AND p.hidden_at IS NULL"
                    + " AND m.withdrawn_at IS NULL";
}
