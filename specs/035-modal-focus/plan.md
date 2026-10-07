# 구현 메모: 035 대화상자 초점 다루기 (v1.16.8)

| 파일 | 바뀜 |
|---|---|
| `lib/modalFocus` (새로) | `trapFocus(dialog, onEscape)`: 첫 초점, Tab 가두기, Esc, 정리할 때 연 버튼으로 초점 돌려주기. `focusables(root)`는 이름이 같은 라디오 묶음을 브라우저처럼 한 Tab 자리로 센다(고른 것, 없으면 첫 것) |
| `components/Modal` (새로) | 바깥 막 + `role="dialog"` `aria-modal` + `trapFocus`. `wide`, `closeOnBackdrop` |
| `ConflictDialog`, `ReportButton`, `WritePage`(발행·백업) | 직접 쓰던 마크업과 신고의 Esc·첫 초점 코드를 `Modal`로 바꿈 |
| `modalFocus.test.ts` 9개, `Modal.test.tsx` 2개 | 첫 초점, Tab 순환, 새어 나간 초점, Esc(안쪽이 먼저 쓴 경우 포함), 조작 요소 없음, 정리, 바깥 막 |

## 결정
- 키 처리는 `document`에 건다. 대화상자 밖에 초점이 새어 나가도 Tab·Esc를 받기 위해서다.
- 첫 초점은 첫 조작 요소다. 저장 충돌 비교에서는 "닫고 계속 편집"(✕)이 되는데, 되돌릴 수 없는 버튼이 아니라 가장 안전한 쪽이다.
- 알림 패널(`NotificationBell`)은 모달이 아니라 펼침 목록이라 그대로 둔다(이미 Esc로 닫힌다).
- 접근성 고침이라 Patch 버전이다.
