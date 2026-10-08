# Feature Specification: AI 발행·삭제 허용 설정

**Feature Branch**: `053-ai-publish-toggle`
**Created**: 2026-10-08
**Status**: Implemented (v1.28.0)
**근거**: 블로그 주인 요청 "다음 버전엔 AI가 발행 및 삭제도 직접 할 수 있도록 설정을 켰다 끄는 설정을 추가해 줘." 052는 AI가 임시글과 "발행 대기"까지만 만들게 했다. 이 기능은 회원이 직접 켤 때만 그 한계를 푼다.

## 사용자 시나리오

1. **Given** 로그인한 회원, **When** 설정 › AI 연결을 열면, **Then** "AI가 발행·삭제하도록 허용"이 꺼져 있고 "켜면 연결한 AI가 글을 바로 발행하거나 삭제할 수 있어요. 삭제는 웹에서 지울 때와 같아요." 안내가 보인다.
2. **Given** 꺼진 설정, **When** 체크하면, **Then** 확인 창이 한 번 더 묻고 [확인]해야 켜진다. 끌 때는 묻지 않는다.
3. **Given** 꺼진 설정과 쓰기 토큰, **When** AI가 `tools/list`를 부르면, **Then** `publish_post`·`delete_post`가 없고, 이름으로 불러도 "설정 › AI 연결에서 켜 달라"는 도구 오류로 거절된다.
4. **Given** 켜진 설정과 쓰기 토큰, **When** AI가 `publish_post`를 부르면, **Then** 웹의 [발행하기]와 같은 규칙(공개 범위·태그·검증)으로 임시글이 발행되고 글 주소를 돌려준다.
5. **Given** 켜진 설정과 쓰기 토큰, **When** AI가 `delete_post`를 부르면, **Then** 웹의 [삭제]처럼 휴지통으로 옮겨지고 30일 안에 복구할 수 있다.
6. **Given** 켜진 설정, **When** 읽기 토큰이거나 남의 글이면, **Then** 거절되고 글은 그대로다.
7. **Given** 접근 토큰(Bearer)만 가진 요청, **When** 설정 API를 부르면, **Then** 401(로그인 필요)로 막힌다.

## Requirements

- **FR-001**: 회원마다 "AI가 발행·삭제하도록 허용" 값을 둔다(`member.ai_publish_allowed`, 기본 false).
- **FR-002**: `GET /api/me/ai-publish`, `PUT /api/me/ai-publish {allowed}`. 로그인 세션 + CSRF로만 부른다. MCP 보안 체인 밖이라 접근 토큰·OAuth 토큰으로는 읽지도 바꾸지도 못하며, 설정을 바꾸는 MCP 도구는 없다.
- **FR-003**: `publish_post(post_id, visibility?, tags?, summary?)`는 본인 임시글만 발행한다. 비운 값은 웹 발행 창이 미리 채우는 값과 같다: 공개 범위는 글에 정해진 값, 태그는 글의 태그 또는 AI 제안, 요약·썸네일은 글에 있던 그대로. `PostCommandService.publish`를 그대로 부른다. 이미 발행한 글은 거절한다.
- **FR-004**: `delete_post(post_id)`는 `PostTrashService.trash`를 그대로 부른다(휴지통 30일, 빈 임시글은 바로 삭제, 이미 휴지통이면 그대로). 웹과 같은 삭제 요청 제한(1분 60번)도 함께 센다.
- **FR-005**: 두 도구는 쓰기 도구라 052의 쓰기 조건(WRITE 범위, 이메일 인증, ACTIVE 계정, 1분 60번·한 시간 30번)을 모두 따르고, 그 위에 설정이 켜져 있어야 한다. 설정은 요청마다 DB에서 새로 읽는다.
- **FR-006**: 설정이 꺼져 있으면 두 도구를 `tools/list`에서 빼고, 불러도 거절한다. 켜져 있으면 `initialize` 안내에 "사용자가 분명히 말했을 때만, 하기 전에 확인" 문장을 덧붙인다. `delete_post`는 `destructiveHint: true`.
- **FR-007**: `/mcp` 안내의 도구 표와 안전 문구에 허용했을 때만 발행·삭제할 수 있다고 적는다.

## 범위 밖
- 공개 범위만 바꾸는 도구, 발행한 글 고치기·다시 발행, 휴지통 복구·완전 삭제 도구.
- 토큰마다 따로 허용하기(지금은 회원 단위 하나).
