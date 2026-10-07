# 구현 메모: 031 움직임 줄이기와 카드 키보드 초점 (v1.16.4)

## 구조
| 파일 | 역할 |
|---|---|
| `styles.css` 끝 | `prefers-reduced-motion` 블록 하나: 전체 전환·애니메이션 0.01ms, `scroll-behavior: auto`, 카드·목차 `transform: none` |
| `styles.css` `.card` | `:hover`와 `:focus-within`을 한 규칙으로 |
| `lib/reducedMotion.test.ts` | 블록이 하나뿐인지, 전체·카드·목차를 덮는지, 카드 초점 규칙 |

## 결정
- 목차에만 있던 움직임 줄이기 규칙은 지우고 전체 규칙 하나로 합쳤다(같은 일을 두 곳에서 하지 않는다).
- `0`이 아니라 `0.01ms`로 둔다. `transitionend`를 기다리는 코드가 생겨도 이벤트가 그대로 온다.
- 목차의 `scrollIntoView({ behavior })`는 스크립트가 직접 고르므로(`Toc.tsx`의 `reducedMotion()`) 그대로 둔다.
- 기능이 늘지 않은 접근성 개선이라 Patch 버전이다.

## 확인
- `reducedMotion.test.ts` 3개, `tsc -b`, `vitest` 286개, `vite build`
