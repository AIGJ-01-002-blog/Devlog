# Feature Specification: 좋아한 글 모아 보기

**Feature Branch**: `027-liked-posts`
**Created**: 2026-10-08
**Status**: Implemented (v1.16.0)
**근거**: 민서 요청 "이상적인 velog형 블로그에 최대한 가깝게"(2026-10-07). velog 읽기 목록(`/lists/liked`)의 "좋아한 포스트"
**선행 기능**: `012-likes`(좋아요), `008-friends-activity`(친구 공개)

## User Scenarios & Testing

### User Story 1 - 좋아한 글을 다시 찾는다 (Priority: P1)
1. **Given** 로그인한 회원, **When** 메뉴의 [좋아한 글]을 누르면, **Then** `/lists/liked`에 좋아요를 누른 최근 순으로 카드가 9개씩 보이고 스크롤하면 이어진다.
2. 지금 읽을 수 없는 글(비공개로 바뀐 글, 친구를 끊은 뒤의 친구 공개 글, 휴지통·숨김 글, 탈퇴 회원 글)은 보이지 않는다. 다시 읽을 수 있게 되면 원래 자리에 다시 보인다.
3. 좋아요가 없으면 "아직 좋아요를 누른 글이 없어요"와 [홈에서 글 찾기].

## Requirements
- **FR-001**: `GET /api/me/liked-posts?cursor=` 본인만. 정렬은 좋아요 시각 최신순(같으면 글 번호 큰 순), 커서는 좋아요 행 기준.
- **FR-002**: 응답은 저장하지 않는다(`no-store`).
