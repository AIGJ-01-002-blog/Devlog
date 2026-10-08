# 구현 메모: 053 AI 발행·삭제 허용 설정 (v1.28.0)

| 파일 | 바뀜 |
|---|---|
| `V14__member_ai_publish.sql` | `member.ai_publish_allowed boolean NOT NULL DEFAULT false` |
| `mcp/application/AccessTokens` | `Caller.aiPublishAllowed`(토큰 인증 때 함께 읽음), 설정 읽기·바꾸기 |
| `mcp/application/McpTools` | `publish_post`·`delete_post`, 설정이 꺼져 있으면 목록에서 빼고 부를 때 거절 |
| `mcp/web/McpController` | `tools/list`·`initialize`가 회원 설정을 본다 |
| `mcp/web/AccessTokenController` | `GET`·`PUT /api/me/ai-publish` |
| 화면 | `components/AiConnectSection`(켜고 끄기, 켤 때 확인), `pages/McpPage`(도구 표·안전 문구), `pages/OAuthAuthorizePage`(동의 화면 문구), `lib/mcp`(설정 API, 도구 표) |
| 테스트 | `McpAiPublishTest` 4개, `AiConnectSection.test.tsx` 1개, `mcp.test.ts` 1개 고침 |

## 결정
- **회원 테이블의 열 하나**: 값이 하나뿐이고 토큰 인증 쿼리에서 함께 읽으면 요청마다 새 값을 보게 된다. JPA `Member`에는 매핑하지 않는다(`ddl-auto: validate`는 남는 열을 문제 삼지 않는다).
- **설정은 웹에서만**: `/api/me/**`는 세션 + CSRF 체인이라 Bearer 토큰으로는 401이다. AI가 자기 권한을 넓히지 못하게 MCP 도구도 두지 않는다.
- **웹과 같은 서비스**: 발행은 `PostCommandService.publish`(태그·이미지·썸네일·AI 제안 정리 확장까지), 삭제는 `PostTrashService.trash`. 웹과 결과가 달라지지 않게 따로 만들지 않았다.
- **비운 값은 발행 창 기본값**: 웹 발행 창이 글의 공개 범위·태그(없으면 AI 제안)·요약을 미리 채우므로 같은 값을 쓴다.
- **임시글만 발행**: 발행한 글의 작업본 다시 발행은 사람이 바뀐 점을 보고 해야 해서 넣지 않았다.
- **목록에서 숨기고 부를 때도 확인**: 상태 없는 서버라 목록이 바뀌어도 알릴 수 없고(`listChanged: false`), 이름을 아는 AI가 부를 수 있으므로 실행 때 다시 본다.
- 화면에 보이는 기능이 늘어나므로 Minor 버전이다.
