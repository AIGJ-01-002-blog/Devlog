# 구현 메모: 060 MCP 도구 강화 1차

| 파일 | 바뀜 |
|---|---|
| `mcp/application/McpTools` | `update_draft`가 발행 글 작업본도 저장, `publish_post` 다시 발행, `search_posts(mine)` 내 글 전체 검색, `upload_image`·`create_image_upload_link` |
| `mcp/application/McpImages` (새) | 서버 쪽 사진 다듬기(줄이기·다시 저장·썸네일), base64 받기, 한 번 쓰는 올리기 표 |
| `mcp/web/McpUploadController` (새) | `PUT|POST /api/mcp/uploads/{표}` |
| `config/SecurityConfig` | 올리기 주소를 MCP 보안 체인(쿠키·CSRF 없음)에 넣음 |
| `mcp/web/McpController` | `initialize` 안내에 이어 쓰기·사진 올리기 방법 |
| `media/PostImages` | `MAX_PIXELS_EDGE`를 공개(같은 해상도 상한을 씀) |
| 화면 | `lib/mcp`(도구 표), `pages/McpPage`(안전 문구) |
| 테스트 | `McpToolsPlusTest` 4개, `mcp.test.ts` 1개 고침 |

## 결정
- **도구 이름은 그대로 `update_draft`**: 이미 연결한 AI 앱은 처음 받은 도구 목록을 기억한다. 새 이름을 만들면 다시 연결하기 전까지 못 쓰고, 비슷한 도구가 둘이면 AI가 헷갈린다. 제목만 "글 고치기"로 바꾸고 설명에 발행 글 동작을 적었다.
- **발행 글 고치기는 허용 없이도 된다**: 작업본은 독자에게 보이지 않고 웹 [변경 취소]로 버릴 수 있어 되돌리기 쉽다. 공개되는 다시 발행만 053의 허용 설정에 묶었다. 053은 "다시 발행은 사람이 보고 해야 한다"며 뺐지만, 허용을 켠 회원이 분명히 말했을 때만 하므로 임시글 발행과 위험이 같다고 봤다. 별도 설정이 필요한지는 일일 보고 질문으로 올린다.
- **사진은 두 길**: AI가 큰 파일을 base64 글자로 쓰면 비싸고 느리다. 명령줄을 쓰는 AI(Claude Code·Codex)는 `curl -T`로 바이트를 바로 보내는 게 맞고, 명령줄이 없는 AI를 위해 작은 사진은 base64로도 받는다.
- **올리기 표는 Redis에 한 번만**: 서명 표(HMAC)는 새 비밀값이 필요하다. Redis GETDEL이면 비밀값 없이 한 번만 쓰이게 할 수 있다. Redis가 멈추면 주소를 만들지 않고 base64를 쓰라고 안내한다.
- **서버가 브라우저 몫을 한다**: 웹 업로드 규칙(사진 정보가 있으면 거절)을 바꾸지 않고, MCP 쪽에서 미리 다시 저장해 같은 `PostImages.upload` 검사를 통과하게 했다. jpg 회전 정보(EXIF Orientation)는 함께 지워져 휴대폰 사진이 누워 보일 수 있다. 스크린샷(png)이 주 용도라 이번에는 그대로 둔다.
- **내 글 검색은 따로**: 공개 검색은 공개 조건과 인덱스 단계에 맞춰져 있고, 하이브리드 검색으로 바꾸는 작업이 따로 진행 중이다. 회원 한 명의 글은 수가 적어 단순 ILIKE로 충분하므로 `McpTools` 안에서 따로 찾는다.
- 기능이 늘어나므로 Minor 버전이다.
