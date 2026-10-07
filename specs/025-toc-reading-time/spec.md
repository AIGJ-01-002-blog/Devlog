# Feature Specification: 글 목차와 읽는 시간

**Feature Branch**: `025-toc-reading-time`
**Created**: 2026-10-08
**Status**: Implemented (v1.14.0)
**근거**: 민서 요청 "이상적인 velog형 블로그에 최대한 가깝게"(2026-10-07). velog 글 상세 오른쪽의 목차(지금 읽는 제목 강조)가 없어서 추가. 읽는 시간은 긴 글을 열기 전에 분량을 알려 준다
**선행 기능**: `003-read-share`(글 상세, 제목 id)

## User Scenarios & Testing

### User Story 1 - 목차로 긴 글을 훑고 이동한다 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** 제목(#~###)이 2개 이상인 글, **When** 넓은 화면(1280px 이상)에서 열면, **Then** 본문 오른쪽에 목차가 화면을 따라 붙어 보이고 하위 제목은 들여 쓴다.
2. **When** 스크롤하면, **Then** 지금 읽는 제목(헤더 아래 기준선을 지난 마지막 제목)이 굵게 강조된다.
3. **When** 목차 항목을 누르면, **Then** 그 제목으로 이동하고(움직임 줄이기 설정이면 바로) 주소에 `#제목id`가 남는다.
4. 제목이 1개 이하이거나 좁은 화면이면 목차를 보이지 않는다.

### User Story 2 - 읽는 시간을 본다 (Priority: P2)

1. **Given** 글 상세, **Then** 작성자·날짜 옆에 "N분 읽기"가 보인다. 공백을 뺀 글자 500자에 1분, 사진 하나에 10초, 반올림, 최소 1분.

## Requirements
- **FR-001**: 목차는 서버가 붙인 제목 id(`h-…`, 003)를 쓴다. 본문을 화면에서 다시 해석하지 않는다.
- **FR-002**: 스크롤 계산은 그림 한 번에 한 번만 한다(requestAnimationFrame).
- **FR-003**: 서버·DB 변경 없음.
