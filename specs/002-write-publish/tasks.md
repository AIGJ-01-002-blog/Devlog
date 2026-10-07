# Tasks: Markdown 글쓰기·임시저장·발행 (002-write-publish)

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

## Phase 1: 기반

- [X] T001 `ContentRenderer`(commonmark + GFM, 제목 한 단계 낮춤, 사진 주인 판별, 중첩 20단계·1초 제한, 요약 200자)
- [X] T002 `Post`·`PostDraft` 엔티티, 시각 규칙 도메인 메서드(publish, changeVisibility)
- [X] T003 `AutosaveStore`(Lua 버전 관문, dirty 집합, 조건부 삭제), `IdempotencyStore`, `JobLock`

## Phase 2: US1 쓰고 발행 (P1)

- [X] T004 [US1] `POST /api/posts`(기본 공개 범위), `POST /api/posts/{id}/publish`(검증 전체 모아 400, 422/409 IN_PROGRESS)
- [X] T005 [US1] `POST /api/markdown/preview`(로그인, 분당 60번)
- [X] T006 [US1] 테스트: 발행·검증·깊은 본문·동시 20건 1회·비공개 404·공격 문자열 32개·제목 정리·미리보기 = 발행

## Phase 3: US2 저장·이어 쓰기 (P2)

- [X] T007 [US2] `PUT /api/posts/{id}/autosave`, `PUT /api/posts/{id}`, `GET /api/posts/{id}/edit`
- [X] T008 [US2] `AutosaveFlushJob`(1분), `EmptyDraftCleanupJob`(매일 04:00 KST)
- [X] T009 [US2] 테스트: 자동 저장 → 다시 열기 → DB 반영, 두 탭 충돌 409 + 서버 내용, Redis 장애 시 DB 저장, 빈 글 정리

## Phase 4: US3 발행 글 고치기 (P3)

- [X] T010 [US3] 발행 글 저장은 작업본으로, `DELETE /api/posts/{id}/draft`(변경 취소)
- [X] T011 [US3] 테스트: 수정 중 발행본 유지, 다시 발행 시 주소·최초 공개일·반응 수 유지, 변경 취소 후 옛 탭 409

## Phase 5: US4 공개 범위 (P4)

- [X] T012 [US4] `PATCH /api/posts/{id}/visibility`, `first_public_at` 한 번만
- [X] T013 [US4] 테스트: 껐다 켜도 최초 공개 시각 유지, 나중에 공개하면 그 시각

## Phase 6: 내 글 관리 목록

- [X] T014 `GET /api/me/posts?tab=drafts|published&visibility=&cursor=`(20개, 개수는 첫 요청만, 수정 중 표시)

## Phase 7: 화면

- [ ] T015 React 에디터: 제목·본문, 미리보기, 자동 저장(3초 멈춤·최대 30초·탭 숨김), 저장 상태 표시, 이탈 경고
- [ ] T016 React 충돌 비교 창(jsdiff, 기호 + 색), 세 가지 선택과 확인 문구
- [ ] T017 React 발행 설정(공개 범위), 내 글 관리 화면
