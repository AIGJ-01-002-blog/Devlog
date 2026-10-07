# 구현 메모: 025 글 목차·읽는 시간 (v1.14.0)

## 구조
| 파일 | 역할 |
|---|---|
| `lib/toc.ts` | `extractToc`(본문의 `h2~h4[id]` → 항목, 가장 높은 제목이 0단계), `activeIndex`(기준선을 지난 마지막 제목), `readingMinutes` |
| `components/Toc.tsx` | 글 오른쪽 목차. 스크롤·크기 변경 때 다음 그림에 한 번 계산, 누르면 부드럽게 이동(움직임 줄이기면 바로) + `history.replaceState`로 `#id` |
| `PostPage` | 본문 옆 `Toc`, 바이라인 "N분 읽기"(본문 글자·사진 수로 계산) |
| `styles.css` | 1280px 이상에서만 목차. 본문 칸(768px) 바깥 오른쪽에 붙이고 `position: sticky`. 제목에 `scroll-margin-top`으로 헤더에 가리지 않게 |

## 결정
- 서버 `ContentRenderer`가 이미 제목에 id를 붙이고(#은 h2로 한 단계 내림) 정화 규칙이 id를 허용하므로 화면만 바꾼다.
- 읽는 시간은 카드에는 넣지 않는다. 목록 쿼리는 본문 앞 600자만 읽어(V3) 전체 길이를 알려면 쿼리를 바꿔야 해서다.

## 확인
- 화면 `toc.test.ts` (목차 단계, 지금 제목, 읽는 시간)
