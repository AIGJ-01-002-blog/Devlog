# 구현 메모: 046 새 로고 (v1.22.1)

| 파일 | 바뀜 |
|---|---|
| `public/favicon.svg` | 받은 PNG(1254px)를 potrace로 벡터 경로 하나(약 5KB)로 바꿈. `prefers-color-scheme: dark`에서 밝은 색 |
| `public/apple-touch-icon.png`, `index.html` | 180px 흰 바탕 아이콘과 link |
| `components/Header`, `styles.css` | `.logo-mark`: 파비콘 SVG를 CSS 마스크로 쓰고 `currentColor`로 칠함 |

## 결정
- 그림 원본은 `favicon.svg` 하나다. 헤더도 같은 파일을 마스크로 써서 경로를 JS 번들에 다시 넣지 않는다(번들 크기 그대로, 파일은 브라우저가 한 번 받아 둔다).
- 마스크는 그림의 모양만 쓰고 색은 글자색이라, 사이트 테마를 기기 설정과 다르게 고정해도 헤더 로고는 맞는 색이다. 탭 아이콘은 사이트 테마를 알 수 없어 기기 설정을 따른다.
- 화면 모양만 바뀌므로 Patch 버전이다.
