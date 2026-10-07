# Feature Specification: 움직임 줄이기와 카드 키보드 초점

**Feature Branch**: `031-reduced-motion`
**Created**: 2026-10-08
**Status**: Implemented (v1.16.4)
**근거**: 민서 요청 "모든 기능을 최적화 해서 구현해줘"(2026-10-07). 운영체제에서 "움직임 줄이기"를 켠 사람에게도 카드가 떠오르고 댓글 강조가 번졌다(목차만 따로 막혀 있었다). 키보드로 카드에 들어가면 마우스와 달리 카드가 떠오르지 않았다.

## User Scenarios & Testing

### User Story 1 - 움직임에 민감한 사람 (Priority: P1)
1. **Given** 운영체제에서 움직임 줄이기를 켠 독자, **When** 홈 카드에 마우스를 올리거나 목차·댓글 강조를 보면, **Then** 위치·크기가 바뀌거나 서서히 변하는 효과 없이 바로 바뀐다.

### User Story 2 - 키보드 사용자 (Priority: P2)
1. **Given** 키보드 사용자, **When** Tab으로 카드 안 링크에 들어가면, **Then** 마우스를 올렸을 때처럼 카드가 떠올라 지금 어느 카드인지 보인다.

## Requirements
- **FR-001**: `prefers-reduced-motion: reduce`이면 모든 요소의 전환·애니메이션을 끄고 부드러운 스크롤을 쓰지 않는다. 이 규칙은 styles.css 한 곳에만 둔다.
- **FR-002**: 그때 카드 떠오름, 목차 활성 항목 확대도 하지 않는다.
- **FR-003**: `.card:focus-within`은 `.card:hover`와 같은 모양이다.
