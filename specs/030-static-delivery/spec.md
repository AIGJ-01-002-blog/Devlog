# Feature Specification: 화면 파일 캐시와 응답 압축

**Feature Branch**: `030-static-delivery`
**Created**: 2026-10-08
**Status**: Implemented (v1.16.3)
**근거**: 민서 요청 "모든 기능을 최적화 해서 구현해줘"(2026-10-07). 화면 JS·CSS에 Spring Security 기본 헤더(`no-cache, no-store`)가 붙어, 글을 열 때마다 같은 파일을 처음부터 다시 받고 있었다. 응답 압축도 꺼져 있어 첫 JS 305KB를 그대로 보냈다.

## User Scenarios & Testing

### User Story 1 - 두 번째 방문부터는 화면 파일을 다시 받지 않는다 (Priority: P1)
1. **Given** 한 번 들어와 본 독자, **When** 다른 글을 열거나 다시 들어오면, **Then** 이름이 같은 화면 파일(`/assets/*`)은 서버에 묻지 않고 브라우저에 있는 것을 쓴다.
2. **Given** 새로 배포되어 화면 파일 내용이 바뀌면, **Then** 파일 이름(해시)이 바뀌므로 독자는 새 파일을 받는다. 이름이 고정된 `index.html`, `theme.js`, `favicon.svg`는 지금처럼 매번 확인한다.

### User Story 2 - 처음 받는 양이 줄어든다 (Priority: P1)
1. **Given** 처음 온 독자, **When** 글 화면을 열면, **Then** HTML·JS·CSS·JSON·RSS가 gzip으로 와서 받는 양이 약 1/3이 된다.

## Requirements
- **FR-001**: `/assets/**` 응답은 `Cache-Control: max-age=31536000, public, immutable`. 없는 파일(404)에는 붙이지 않는다.
- **FR-002**: 1KB 이상인 `text/html`, `text/css`, `text/javascript`, `application/javascript`, `application/json`, `application/rss+xml`, `application/xml`, `image/svg+xml` 응답은 요청이 허용하면 gzip으로 보낸다.
- **FR-003**: 화면 주소의 HTML, API, 미디어의 캐시 정책은 바뀌지 않는다.

## Success Criteria
- **SC-001**: 다시 방문할 때 화면 파일 요청 0건(지금은 매번 전부).
- **SC-002**: 첫 JS 전송량이 305KB에서 약 94KB(gzip)로 준다.
