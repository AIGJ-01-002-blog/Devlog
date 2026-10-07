# Feature Specification: RSS 구독

**Feature Branch**: `026-rss`
**Created**: 2026-10-08
**Status**: Implemented (v1.15.0)
**근거**: 민서 요청 "이상적인 velog형 블로그에 최대한 가깝게"(2026-10-07). velog는 블로그별 RSS(`v2.velog.io/rss/{아이디}`)를 준다
**선행 기능**: `003-read-share`(공개 목록)

## User Scenarios & Testing

### User Story 1 - RSS 리더로 블로그를 구독한다 (Priority: P1)
1. **Given** 블로그, **When** RSS 리더에 `/@블로그/rss`(또는 블로그 주소)를 넣으면, **Then** 최신 공개 글 20개가 제목·주소·발행 시각·작성자·요약과 함께 보인다.
2. **Given** 사이트, **When** `/rss`를 구독하면, **Then** 전체 최신 공개 글 20개가 보인다.
3. 블로그 프로필 줄에 [RSS] 링크가 있고, 수집하는 화면의 머리에 `<link rel="alternate" type="application/rss+xml">`가 있어 리더가 블로그 주소만으로 찾는다.

## Requirements
- **FR-001**: 공개 목록과 같은 조건(`PUBLIC_LIST_CONDITION`). 친구 공개·비공개·임시·휴지통·숨김 글과 탈퇴 회원 글은 나오지 않는다.
- **FR-002**: RSS 2.0, UTF-8, `application/rss+xml`. 순서는 처음 공개 시각 최신순. 본문 대신 요약(목록과 같은 앞 600자 기반).
- **FR-003**: 누구에게나 같은 응답이라 공유 캐시 10분(`public, max-age=600`).
- **FR-004**: 없는 블로그는 404.
