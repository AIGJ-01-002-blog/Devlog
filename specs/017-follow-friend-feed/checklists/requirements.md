# Specification Quality Checklist: 팔로우·피드와 친구 관계·친구 최근 활동

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-07
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
- 24 §9 공통 완료 기준 7개 → SC-001~SC-007로 모두 옮김. 친구·최근 활동은 근거 문서에 완료 기준 표가 없어 06 §6-2·01 결정 기록 2026-10-07에서 SC-008~SC-010을 새로 뽑음.
- 남은 [NEEDS CLARIFICATION] 3개: (1) Edge Cases — 탈퇴 유예 중인 친구·요청자의 표시 (2) FR-011 — 친구 요청의 계정 조건(로그인만 / 이메일 인증) (3) Assumptions — Tier C 출시 순서(52 §11.2).
- 01 결정 기록 2026-10-07 '마지막 로그인·최근 활동 표시' 중 ①(본인 마지막 로그인)은 계정 spec 범위로 두고, ②(친구 최근 활동)만 이 spec에 넣음. 최근 활동 표시 위치는 친구 목록으로 가정(52 §9).
- '1주 이상' 경계(7일 이상)와 'N일 전'(2~6일)은 01 문구에서 해석한 것이라 clarify 때 확인 권장.
- 친구 관계 30일 정리는 01 M1에 따라 항상 실행(13 §3-3·44 order 60의 '(적용자)' 표기는 원문 수정 대상).
