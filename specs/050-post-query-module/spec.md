# Feature Specification: 글 조회를 글 모듈로 옮기기 (리팩터링)

**Feature Branch**: `050-post-query-module`
**Created**: 2026-10-08
**Status**: Implemented (v1.25.1)
**근거**: 2026-10-08 민서님 답 14 "옮겨줘 클린코드가 더 중요해". discovery 모듈이 post·post_draft·follow·post_like·friendship·post_tag·tag 테이블을 직접 읽어 헌법 원칙 IV(모듈은 다른 모듈의 테이블을 읽지 않는다)를 어기고 있었다.

## Requirements
- **FR-001**: 글 카드·글 상세·이전/다음 글을 읽는 SQL은 글 모듈(`post.query`)에만 있다.
- **FR-002**: 팔로우·태그·좋아요·친구 테이블에 대한 조건은 각 모듈이 SQL 조각(`FollowSql`, `TagSql`, `FriendSql`)이나 조회 서비스(`LikeQuery`)로 넘긴다. 글 모듈은 그 테이블을 모른다.
- **FR-003**: discovery 모듈은 SQL과 `JdbcTemplate` 없이 조립만 한다(목록 선택, 보는 사람 기준의 팔로우·좋아요·친구 여부, 태그·소셜 정보 덧붙이기).
- **FR-004**: API 응답 모양, 쿼리 수, 정렬·커서·권한 판정은 바뀌지 않는다. 기존 통합 테스트가 그대로 통과한다.

## 범위 밖
- 검색(search)·시리즈(series)·친구(friend)·팔로우(follow) 모듈이 자기 목록을 만들며 회원 테이블을 함께 읽는 부분. 회원 프로필 사진 조각은 회원 모듈(`MemberSql`)로 옮겨 두었다.
