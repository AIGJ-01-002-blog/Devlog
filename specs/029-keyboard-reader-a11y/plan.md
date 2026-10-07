# 구현 메모: 029 키보드·화면 읽기 프로그램 이동 개선 (v1.16.2)

## 구조
| 파일 | 역할 |
|---|---|
| `lib/focusMain.ts` | 첫 `main`에 `tabindex="-1"`을 주고 스크롤 없이 초점 |
| `components/SkipLink.tsx` | "본문으로 건너뛰기". `main`이 있으면 초점을 옮기고, 없으면 `#main` 기본 동작 |
| `lib/router.tsx` `Link` | 이동 → 맨 위로 스크롤 → 다음 그림에서 `focusMain()` |
| `styles.css` | `.skip-link`(초점 때만 보임), `main:focus` 테두리 없음 |

## 결정
- 초점 이동은 `Link`를 눌렀을 때만 한다. `navigate(..., { replace })`로 주소만 바꾸는 곳(글쓰기 첫 저장, 로그인 돌려보내기)에서 쓰던 칸의 초점을 빼앗지 않으려는 것이다.
- 화면마다 `main`이 하나라 id를 붙이지 않고 첫 `main`을 찾는다.
- 기능이 늘지 않은 접근성 개선이라 Patch 버전이다.

## 확인
- `focusMain.test.ts`(초점 이동, 본문 없음). `tsc -b`, `vitest` 270개
