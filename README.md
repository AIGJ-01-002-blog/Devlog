# AIGJ-01-002-blog docs

팀 블로그 명세 저장소입니다. [GitHub Spec Kit](https://github.com/github/spec-kit)(v1.1.1)의
스펙 주도 개발 흐름으로 진행합니다.

## 폴더

| 경로 | 내용 |
|---|---|
| `docs/` | 팀 공통 요구사항·설계 문서 (01 공통 요구사항, 02 아키텍처, 51 통합 ERD, 52 기능 총정리 등) |
| `erd/` | 통합 ERD 기준 스키마 `V1__common_schema.sql`과 동작 테스트 |
| `scripts/`, `verification/` | 설계 검증 스크립트와 검증 보고서 |
| `.specify/memory/constitution.md` | 프로젝트 헌법 (모든 spec·plan이 따르는 원칙) |
| `specs/NNN-이름/` | 기능별 spec·plan·tasks |
| `.claude/skills/speckit-*` | Claude Code에서 쓰는 Spec Kit 명령 |

## 진행 방법

준비물: Python 3.11+, [uv](https://docs.astral.sh/uv/), Claude Code.

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.1.1
specify version
```

저장소 루트에서 Claude Code를 열고 채팅에 차례로 입력합니다 (터미널 명령이 아닙니다).

```
[한 번, 완료]  /speckit-constitution
[기능마다]     /speckit-specify → (/speckit-clarify) → /speckit-plan → /speckit-tasks
               → (/speckit-analyze) → /speckit-implement → /speckit-converge
```

## 기능 순서 (MVP)

| spec | 범위 | 상태 |
|---|---|---|
| `001-auth-ownership` | GitHub 가입·로그인, 블로그 주소·닉네임, 소유 권한, 내 글 관리(본인 글만) | spec 작성됨 |
| `002-write-publish` | Markdown 작성·임시저장·발행·공개 범위 | 예정 |
| `003-read-share` | 홈·개인 블로그·글 상세·링크 미리보기 | 예정 |
