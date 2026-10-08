package com.team.blog.post.access;

import com.team.blog.shared.security.MemberPrincipal;

/** 글을 보는 사람. 비회원이면 memberId가 null이다. */
public record Viewer(Long memberId, boolean admin) {
    public static final Viewer ANONYMOUS = new Viewer(null, false);

    public static Viewer of(MemberPrincipal p) {
        return p == null ? ANONYMOUS : new Viewer(p.id(), p.isStaff());
    }

    public boolean is(long memberId) {
        return this.memberId != null && this.memberId == memberId;
    }
}
