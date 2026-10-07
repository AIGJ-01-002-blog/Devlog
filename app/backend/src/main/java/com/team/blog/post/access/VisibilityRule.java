package com.team.blog.post.access;

import com.team.blog.account.domain.Visibility;

/**
 * 공개 범위 값 하나의 읽기 규칙 (docs/06 R-3). 값을 더할 때(FRIENDS 등)는 이 Bean을 하나 더 등록한다.
 * 작성자 여부·삭제·숨김·상태는 PostAccessPolicy가 먼저 확인하고, 여기서는 "작성자가 아닌 사람"의 판정만 한다.
 */
public interface VisibilityRule {
    Visibility visibility();

    boolean canRead(ReadablePost post, Viewer viewer);
}
