# Implementation Plan: Markdown 글쓰기·임시저장·발행 (002-write-publish)

**Branch**: `claude/blog-implementation-g7il4l` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

`post` 모듈을 새로 만든다. 새 글은 DB에 `DRAFT` 행을 먼저 만들고, 자동 저장은 Redis Hash(`autosave:post:{id}`)에 버전 확인 Lua로
쓴 뒤 1분마다 DB에 반영한다(임시글은 `post`, 발행 글은 `post_draft`). 수동 저장·발행·변경 취소도 같은 Lua를 버전 관문으로 써서,
어느 경로로 저장했든 오래된 탭의 저장은 409가 된다. 발행은 렌더링(트랜잭션 밖) → 행 잠금 → 버전 확인 → 시각 규칙 → 커밋 후 Redis
정리 순서이고, `Idempotency-Key`로 같은 요청을 한 번만 처리한다. 본문 HTML은 `ContentRenderer` 하나가 만든다(미리보기·발행 공용).

## Technical Context

001과 같다. 추가: commonmark 0.30 + GFM 확장, OWASP Java HTML Sanitizer.

## Constitution Check

| 원칙 | 확인 |
|---|---|
| I. 공통 기준선 | V1의 `post`·`post_draft`를 그대로 쓴다. 스키마 변경 없음 |
| II. 서버가 권한 결정 | 모든 쓰기는 `author_id = :me` 조건 조회(행 잠금 포함). 남의 글·없는 글 404 |
| III. 본문 안전성 | 직접 쓴 HTML은 글자로, 허용 목록 정화, 외부 링크 rel, 남의·외부 사진은 링크. 공격 문자열 32개 테스트 |
| IV. 모듈 경계 | 발행 후속 처리는 `PostPublished`·`PostEdited` 사건과 `PublishExtension`(태그·사진이 붙을 자리)로만 연결 |
| V. 테스트 | 인수 시나리오·docs/05 §10·docs/06 §8·docs/12 §11 항목을 통합 테스트로 확인 |

## 설계 결정 (spec에 없던 것)

| 결정 | 이유 |
|---|---|
| 현재 버전 = max(Redis, post_draft, post)를 Lua 안에서 계산 | 수동 저장이 DB 버전을 올린 뒤 Redis에 남은 옛 버전으로 자동 저장이 통과하는 틈을 없앤다 |
| 수동 저장·발행·변경 취소도 Lua 관문을 거침 | 발행 확인과 커밋 사이에 들어온 자동 저장이 조용히 사라지는 경합을 막는다 (docs/05 §7의 틈 보완) |
| Redis 장애 시 행 잠금 + DB 버전으로 판정 | docs/04 §2-6. 자동 저장은 DB에 바로 쓴다 |
| 예약 작업은 Redis 잠금(`lock:job:*`)으로 한 대만 실행 | 쿠버네티스 복제본이 여러 개여도 반영·정리가 겹치지 않는다(ShedLock 대신 의존성 없이) |
| 썸네일은 첫 번째 내 사진 원본 주소 | 640px 썸네일 규칙은 사진 업로드(009)에서 바꾼다 |
| 자동 저장 요청 제한은 글마다 5초에 1번 | docs/04 §2-1. 브라우저는 429의 Retry-After를 따른다 |

## V3 정규화 이후 (2026-10-07)

ERD 문서 660의 V3 마이그레이션으로 `post.content_html`·`excerpt`·`thumbnail_url`·`render_version`과 조회수·좋아요 수·댓글 수 컬럼이 없어졌다.
위 설계에서 이 컬럼을 "저장한다"고 한 부분은 다음으로 바뀐다.

- 본문 HTML: 읽을 때 `ContentRenderer`로 만들고 `RenderedHtmlCache`가 `render:post:{id}:{edit_version}:{렌더 규칙 버전}` 키로 Redis에 7일 캐시한다. Redis가 안 되면 매번 렌더링한다.
- 목록 요약: `left(content_md, 600)`을 읽어 `ContentRenderer.excerpt`로 만든다.
- 대표 사진: `post_image`에서 가장 작은 position의 사진 썸네일. 발행 때 `PostImageLinker`(PublishExtension)가 본문 사진을 순서대로 연결한다.
- 수: `post_stat` 뷰. SQL 조각은 `post/infra/PostSql`에 모았다.
- API 응답 모양은 바뀌지 않았다.
