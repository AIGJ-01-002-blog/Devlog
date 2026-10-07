# 팀 블로그 명세 (Spec Kit)

세 팀원이 같은 회원·글·권한·데이터 규칙을 공유하는 velog형 블로그 플랫폼의 명세 저장소입니다.
[GitHub Spec Kit](https://github.com/github/spec-kit) **v1.1.1**의 스펙 주도 개발(SDD) 구조로 정리했습니다.

## 구조

| 경로 | 내용 |
|---|---|
| [`.specify/memory/constitution.md`](.specify/memory/constitution.md) | 프로젝트 원칙 7개. 모든 plan·analyze가 이 원칙으로 점검합니다 |
| [`specs/`](specs/) | 기능별 명세 `###-이름/spec.md` (무엇·왜·완료 기준) + `checklists/requirements.md` |
| [`docs/`](docs/) | 원본 설계·결정 문서 01~52. **결정의 출처**이며 spec은 이 문서를 링크합니다 |
| `.claude/skills/speckit-*` | Claude Code에서 쓰는 Spec Kit 스킬 |

spec과 `docs/`가 어긋나면 `docs/01-common-requirements.md`의 결정 기록이 우선이고, spec을 고칩니다.

## 기능 명세 목록

| # | 기능 | 요구사항 | 근거 문서 | Tier |
|---|---|---|---|---|
| [001](specs/001-member-auth/spec.md) | 가입·로그인·인증 | C-AUTH-1 | 07, 08 | A |
| [002](specs/002-profile-nickname/spec.md) | 프로필·닉네임 | C-AUTH-2 | 09, 11 | A |
| [003](specs/003-draft-autosave/spec.md) | 임시글·자동 저장 | C-POST-2 | 04 | A |
| [004](specs/004-image-upload/spec.md) | 사진 업로드 | C-IMG-1 | 23, 04 | B |
| [005](specs/005-post-publish/spec.md) | 글 작성·발행·수정 | C-POST-1, C-POST-3 | 05, 12 | A |
| [006](specs/006-post-visibility/spec.md) | 공개 범위 | C-POST-4 | 06 | A |
| [007](specs/007-post-delete-trash/spec.md) | 글 삭제·휴지통 | C-POST-5 | 13 | A |
| [008](specs/008-post-list/spec.md) | 홈·개인 블로그 목록 | C-READ-1, C-BLOG-1 | 10 | A |
| [009](specs/009-post-detail/spec.md) | 글 상세 | C-READ-2 | 40 | A |
| [010](specs/010-manage-posts/spec.md) | 내 글 관리·소유 권한 | C-MANAGE-1, C-OWN-1 | 41, 42 | A |
| [011](specs/011-tag/spec.md) | 태그 | C-TAG-1 | 22 | B |
| [012](specs/012-comment/spec.md) | 댓글·답글 | C-CMT-1 | 21 | B |
| [013](specs/013-like/spec.md) | 좋아요 | C-LIKE-1 | 30 | B |
| [014](specs/014-view-count/spec.md) | 조회수 | C-VIEW-1 | 31 | B |
| [015](specs/015-search/spec.md) | 검색 | — | 33 | C |
| [016](specs/016-notification/spec.md) | 인앱 알림 | — | 25, 20 | C |
| [017](specs/017-follow-friend-feed/spec.md) | 팔로우·친구·피드 | — | 24, 06 | C (친구는 공통) |
| [018](specs/018-trending/spec.md) | 트렌딩 | — | 32 | C |
| [019](specs/019-ai-tag-suggest/spec.md) | AI 태그 추천 | — | 34 | C |
| [020](specs/020-report-hide/spec.md) | 신고·숨김·정지 | — | 43 | C |
| [021](specs/021-member-withdraw/spec.md) | 회원 탈퇴 | — | 44, 13 | C |
| [022](specs/022-dark-mode/spec.md) | 다크 모드·화면 상태 | — | 45 | C |

공통 기반 문서(spec으로 만들지 않고 plan 단계에서 참조): [02 아키텍처](docs/02-architecture.md), [03](docs/03-erd.md)·[51 통합 ERD](docs/51-erd-unified.md), [20 도메인 이벤트](docs/20-domain-events.md), [42 권한 표](docs/42-permission-matrix.md), [52 기능 총정리](docs/52-feature-summary.md).

## 쓰는 법

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.1.1
```

이 저장소에서 Claude Code를 열고, 기능 하나씩 아래 순서로 진행합니다.

```text
/speckit-clarify   ← spec의 [NEEDS CLARIFICATION] 해소
/speckit-plan      ← docs/02·51을 근거로 기술 설계
/speckit-tasks
/speckit-analyze
/speckit-implement → /speckit-converge (Converged까지 반복)
```

새 기능은 `/speckit-specify "<요구사항 ID와 설명>. 근거 docs/<문서>"`로 추가합니다. 번호는 자동으로 이어집니다.
