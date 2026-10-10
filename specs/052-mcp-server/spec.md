# Feature Specification: devlog MCP 서버와 개인 접근 토큰

**Feature Branch**: `052-mcp-server`
**Created**: 2026-10-08
**Status**: Implemented (v1.27.0)
**근거**: 2026-10-08 민서님 답(5번)과 추가 요청(ChatGPT·Codex에서도): "MCP를 모든 회원이 사용할 수 있도록 열어 줘. MCP로 사용자의 AI에 연결하면 개발 일지를 자동으로 작성해 주는 기능". 코디네이터 정리: 발행은 사람 확인, 개인 접근 토큰, 요청 제한.

## 사용자 시나리오

1. **Given** 로그인한 회원, **When** 설정 › AI 연결에서 이름·권한·만료를 골라 [토큰 만들기]를 누르면, **Then** 토큰 원문과 토큰이 들어간 Claude Code 연결 명령이 한 번만 보이고, 목록에는 이름·앞부분·권한·만료·마지막 사용만 남는다.
2. **Given** 쓰기 토큰으로 연결한 AI, **When** 사용자가 "오늘 개발 일지 써 줘"라고 하면, **Then** `write_devlog`가 임시글을 만들고 편집 화면 링크를 돌려준다. 글은 공개되지 않는다.
3. **Given** AI가 만든 임시글, **When** 회원이 편집 화면을 열면, **Then** AI가 제안한 태그가 발행 창에 채워져 있고, AI가 `request_publish`를 불렀으면 위에 "AI가 발행을 요청했어요" 알림과 [발행 창 열기]가 보인다.
4. **Given** 읽기 토큰, **When** 쓰기 도구를 부르면, **Then** 도구 오류("읽기 전용")로 거절되고 글이 생기지 않는다.
5. **Given** 남의 비공개 글, **When** `get_post`로 읽으려 하면, **Then** 찾을 수 없다고 답하고 본문을 주지 않는다.
6. **Given** 폐기·만료된 토큰이나 토큰 없는 요청, **When** `/api/mcp`를 부르면, **Then** 401과 `WWW-Authenticate: Bearer`.

7. **Given** ChatGPT 커넥터에 MCP 주소만 넣은 회원, **When** ChatGPT가 연결을 시작하면, **Then** devlog 동의 화면(`/oauth/authorize`)에서 앱 이름·돌아갈 곳·권한을 보고 [허용]하면 연결되고, 설정 › AI 연결에 "로그인 연결"로 보이며 [연결 끊기]로 끊는다.

## Requirements

- **FR-001**: MCP 서버는 `POST /api/mcp` 하나다. Streamable HTTP의 상태 없는 형태(요청 하나에 JSON 응답 하나)로 `initialize`, `ping`, `tools/list`, `tools/call`과 알림(202)을 처리한다. `GET`은 405. 프로토콜 버전은 2025-11-25·2025-06-18·2025-03-26을 받는다.
- **FR-002**: 인증은 `Authorization: Bearer dvl_…` 개인 접근 토큰만 본다. 세션 쿠키·CSRF는 쓰지 않는다. 토큰은 무작위 32바이트, DB에는 SHA-256 해시와 앞 8자만 둔다.
- **FR-003**: 토큰은 회원당 유효한 것 10개까지(409 TOKEN_LIMIT), 이름 1~40자, 만료 30·90·365일(기본 90), 권한 READ·WRITE(기본 WRITE). 폐기는 본인 토큰만(남의 것·없는 것은 404).
- **FR-004**: 도구는 `write_devlog`, `create_draft`, `update_draft`, `request_publish`(쓰기), `search_posts`, `get_post`, `list_my_posts`, `list_tags`(읽기). 발행·공개 범위 변경·삭제 도구는 없다.
- **FR-005**: `request_publish`는 글을 발행하지 않는다. "발행 대기" 시각을 기록하고 편집 화면 링크를 돌려준다. 글이 발행되면 AI 제안 기록을 지운다.
- **FR-006**: `get_post`·`search_posts`는 웹과 같은 공개 범위 검사를 거친다. 본인 글은 임시글도 읽는다. `update_draft`는 본인 임시글만 고치며 저장 버전 충돌을 지킨다.
- **FR-007**: 요청 제한은 회원당 1분 60번, 쓰기 도구는 한 시간 30번. 쓰기 도구는 이메일 인증 회원만. 회원 상태가 ACTIVE가 아니면 403.
- **FR-008**: 도구 실패는 JSON-RPC 오류가 아니라 도구 결과(`isError: true`)로, AI가 사람에게 그대로 전할 수 있는 문장으로 돌려준다.
- **FR-009**: 탈퇴 정리 때 토큰을 모두 지운다. 편집 화면은 `GET /api/posts/{id}/ai-hint`(본인 글만, 없으면 204)로 태그 제안·발행 요청을 받는다.

- **FR-010**: OAuth 2.1 인가 서버. 메타데이터 `/.well-known/oauth-protected-resource`(RFC 9728)·`/.well-known/oauth-authorization-server`(RFC 8414), 401 응답의 `WWW-Authenticate`에 `resource_metadata`. 동적 등록 `POST /api/oauth/register`(RFC 7591, 공개 클라이언트, 돌아갈 주소는 https 또는 localhost http, IP당 시간 20번).
- **FR-011**: 인가 코드 + PKCE(S256)만. 동의는 로그인 세션 + CSRF로 보내고, 코드는 5분·한 번만. 응답에 `iss`(RFC 9207)를 붙인다. `resource`가 오면 이 서버의 MCP 주소여야 한다. 범위는 `devlog.read`·`devlog.write`(없으면 쓰기까지).
- **FR-012**: `POST /api/oauth/token`은 `authorization_code`·`refresh_token`. 접근 토큰 1시간, 갱신 토큰 90일이며 쓸 때마다 바꾼다(회전). OAuth 연결 하나가 토큰 표의 한 행이라 같은 권한 검사·요청 제한·폐기를 따르고, 개인 토큰 10개 한도에는 세지 않는다.
- **FR-012a**: (2026-10-10, ChatGPT 연결 보강) 등록 본문의 다른 표준 필드(`grant_types`·`token_endpoint_auth_method` 등)는 무시하고 공개 클라이언트(`none`)로 답한다. 토큰 요청에 `client_id`가 본문에 없으면 `Authorization: Basic`의 앞부분에서 읽고 비밀값은 보지 않는다(`client_secret_basic`으로 보내는 앱). ChatGPT의 커넥터별 돌아갈 주소(`https://chatgpt.com/connector/oauth/...`)도 https라 그대로 받는다.
- **FR-013**: Codex는 개인 토큰을 환경 변수(`bearer_token_env_var`)로 쓰는 설정을 안내 화면에서 복사한다.

- **FR-014**: (민서님 답 4번 변경) 태그 추천·메모 다듬기는 `blog.ai.prefer=local`(기본)이면 집 PC Ollama를 먼저 부르고, 연결 실패·시간 초과·바쁨이면 같은 요청을 Gemini로 넘긴다. 연결 실패 뒤 `local.down-for`(60초) 동안 집 PC를 건너뛴다. 형식 오류는 건너뛰지 않는다. `prefer=gemini`면 예전 순서(018).
- **FR-015**: Ollama 요청에 접근 헤더를 붙인다: `OLLAMA_ACCESS_CLIENT_ID`·`SECRET`(Cloudflare Access 서비스 토큰), `OLLAMA_AUTH_TOKEN`(Bearer). 설정값을 로그에 찍지 않는다.

## 범위 밖
- 임베딩·요약 대기열(의미 검색 spec에서 집 PC 대기열로 넣는다).
- 서버가 먼저 보내는 알림(SSE), 시리즈·통계 도구, 유료 기능과의 연동.
