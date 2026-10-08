# 구현 메모: 050 MCP 개발 일지 중심 첫 화면 (v1.26.0)

| 파일 | 바뀜 |
|---|---|
| `pages/HomePage` | 비회원 소개를 슬로건 + 예시 장면(`HeroDemo`)으로 |
| `pages/McpPage`, `lib/mcp`, `components/CopyCode` | `/mcp` 안내 화면(처음 열 때 받는 묶음), 연결 명령·설정 만들기, 복사 상자 |
| `components/Header` | [AI 연결] 링크 |
| `page/PageController` | `GET /mcp` 공개 껍데기, 첫 화면 설명을 슬로건으로 (`SLOGAN`) |
| 테스트 | `mcp.test.ts` 3개, `McpGuidePageTest` 2개 |

## 결정
- 슬로건은 민서님이 고른 방향(MCP 개발 일지 중심)의 추천 1번. 짧고 "AI와 같이 코딩하는 개발자"를 바로 겨냥한다.
- MCP 서버 주소는 `/api/mcp`로 둔다. `/mcp`는 사람이 읽는 안내 화면이고, 서버는 다른 API처럼 `/api` 아래에서 같은 보안 설정을 따른다.
- 안내 화면을 서버보다 먼저 내는 이유: 첫 화면 메시지를 바로 바꾸고, 서버(051)는 토큰·요청 제한 검수에 시간이 더 든다. 그동안 "곧 열려요"로 솔직하게 알린다.
- 화면에 보이는 기능이 늘어나므로 Minor 버전이다.
