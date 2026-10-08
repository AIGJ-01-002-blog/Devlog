# 구현 메모: 054 문의·신고와 AI 버그 신고 (v1.29.0)

| 파일 | 바뀜 |
|---|---|
| `V15__inquiry.sql` | `inquiry`, `notification_inquiry`, 알림 종류 CHECK에 `INQUIRY_ANSWERED` |
| `inquiry/application` | `InquiryService`(접수·내 문의·관리 목록·처리·알림), 종류·상태 enum, 탈퇴 정리(75) |
| `inquiry/web` | `POST /api/inquiries`, `GET /api/me/inquiries`, `GET`·`PATCH /api/admin/inquiries/**` |
| `release` | `ReleaseNotes`(CHANGELOG 나누기·렌더링), `GET /api/release-notes` |
| `pom.xml`, `Dockerfile` | `CHANGELOG.md`를 jar의 `release/`로 복사 (도커는 `/CHANGELOG.md`에 먼저 둔다) |
| `mcp/application` | `Caller.admin`·`tokenName`, 도구 Gate(NONE·AI_PUBLISH·REPORT·ADMIN), `report_bug`·관리자 도구 3개 |
| `mcp/web/McpController` | `initialize` 안내에 버그 신고 문장, 관리자 안내 |
| `notification`, `telegram` | `INQUIRY_ANSWERED` 만들기·읽기·문구 |
| `page/PageController` | `/support`(개인 화면 껍데기), `/releases`(공개, 최근 버전 제목을 서버가 그림) |
| 화면 | `SupportPage`, `AdminInquiriesPage`, `AdminInquiryPage`, `ReleasesPage`, `lib/inquiry`, `lib/releases`, 헤더 메뉴, 알림 문구, `/mcp` 도구 표 |
| 테스트 | `InquiryTest` 4개, `MigrationTest` 표 수, `inquiry.test.ts`, `releases.test.ts`, `notifications.test.ts` |

## 결정
- **블로그 DB에 저장, GitHub 이슈는 만들지 않음**: 사용자 글(개인 정보·코드 조각이 섞일 수 있다)이 공개 저장소에 그대로 나가지 않게. 공개해야 할 내용은 관리자가 다듬어 직접 옮긴다.
- **Crowfoot `report_bug`를 그대로 본뜸**: 이름·"동의 후 신고"·본문 순서(요약·재현·기대·실제)를 같게 해 팀이 쓰던 그대로 AI가 신고한다. Crowfoot은 커뮤니티 게시판에 올리지만 우리는 운영자만 보는 문의함에 넣는다.
- **읽기 토큰으로도 신고**: 글을 쓰지 않으므로 쓰기 권한을 요구하지 않는다. 남용은 회원별 요청 제한으로 막는다.
- **인증 전 회원도 문의 가능**: "인증 메일이 안 와요"를 받아야 한다. 글·댓글 신고(019)는 그대로 인증 후.
- **관리자 도구를 MCP에**: 관리자가 자기 토큰으로 AI를 연결하면 AI가 접수된 버그를 읽고(→ 패치·릴리스) 상태와 고친 버전을 적는다. 역할은 요청마다 새로 읽는다. 사용자 글은 자료로만 읽도록 감싼다.
- **알림 종류 하나 추가**: 답변이 왔는지 화면을 열어 봐야 아는 것은 불편하다. V3 정규화 규칙대로 대상 표(`notification_inquiry`)를 따로 둔다.
- **릴리스 노트는 CHANGELOG 한 곳**: 따로 적지 않고 저장소의 CHANGELOG를 jar에 넣어 읽는다. 맨 위 버전이 곧 지금 버전이라 문의에 "접수 때 버전"을 남길 수 있다.
- 화면에 보이는 기능이 늘어나므로 Minor 버전이다.

## 버그 신고 → 패치 → 릴리스 경로
1. 사용자가 웹 [문의·신고] 또는 연결한 AI의 `report_bug`로 버그를 남긴다(경로 MCP면 도구 이름·토큰 이름·접수 때 버전이 함께 남는다).
2. Claude가 매일 오전 일일 보고 전에 관리자 토큰으로 연결한 devlog MCP에서 `list_inquiries(category=BUG)`로 새 신고를 읽는다. 관리자 토큰이 없으면 민서님이 관리자 화면 `/admin/inquiries`를 확인한다.
3. 받은 신고는 `update_inquiry(status=IN_PROGRESS)`로 표시하고, 재현 → 테스트 추가 → 수정 PR(본문에 "문의 #번호"만 적고 사용자 글은 옮기지 않는다) → 테스트 통과 후 머지·릴리스한다.
4. 릴리스 뒤 `update_inquiry(status=RESOLVED, fixed_version=x.y.z, answer=…)`로 고친 버전과 답변을 적는다. 회원에게 알림이 가고, [내 문의]에서 릴리스 노트의 그 버전으로 이어진다.
5. 재현되지 않거나 의도된 동작이면 CLOSED와 답변으로 닫는다.
