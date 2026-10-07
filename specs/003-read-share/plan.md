# Implementation Plan: 읽기·공유 (003-read-share)

**Branch**: `claude/blog-implementation-g7il4l` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

읽기 판정은 `PostAccessPolicy.canRead` 한곳(삭제 → 작성자 탈퇴 → 작성자 본인 → 임시글 → 숨김 → 공개 범위 규칙 Bean)에서 한다.
목록은 `PUBLIC_LIST_CONDITION`(공개 목록 부분 인덱스 조건과 같음)을 쓰는 한 번의 SQL(글 + 작성자 + 프로필 사진)이고,
커서는 (first_public_at 마이크로초, id)를 서명해 감싼 불투명 값이다. 화면 주소(`/`, `/@handle`, `/@handle/posts/{id}`)는
`PageController`가 React 앱의 index.html에 머리말(정규 주소·OG·noindex)과 첫 화면 HTML, 초기 데이터(application/json)를 넣어 돌려준다.

## Constitution Check

| 원칙 | 확인 |
|---|---|
| II. 서버가 권한 결정 | 상세·화면 모두 같은 `canRead`. 판정 뒤에 301을 해서 볼 수 없는 글의 작성자가 드러나지 않음 |
| III. 본문 안전성 | 상세는 발행 때 정화한 HTML만 출력. 제목·요약·닉네임은 이스케이프, 초기 데이터는 `<`·`>`·`&`를 유니코드 이스케이프 |
| IV. 모듈 경계 | `discovery`는 읽기 전용 SQL, 공개 범위 규칙은 `VisibilityRule` Bean 추가로 확장 |
| V. 테스트 | 인수 시나리오, 커서 위조, 숨김·탈퇴, 공개 목록 인덱스 사용(EXPLAIN) |

## 설계 결정

| 결정 | 이유 |
|---|---|
| 첫 화면 HTML을 서버에서 넣음(제목·작성자·본문·카드 목록) | JS 없이도 링크 미리보기·검색 엔진이 내용을 읽는다. React가 그 위에 다시 그린다 |
| 초기 데이터는 `<script type="application/json">` | 실행되지 않는 데이터 블록이라 CSP `script-src 'self'`를 지킨다. 첫 화면에서 API를 다시 부르지 않는다 |
| 상세 응답 `private, no-cache`, 공개 아닌 글 `private, no-store` | docs/40 R-9, docs/06 R-5 |

## V3 정규화 이후 (2026-10-07)

ERD 문서 660의 V3 마이그레이션으로 `post.content_html`·`excerpt`·`thumbnail_url`·`render_version`과 조회수·좋아요 수·댓글 수 컬럼이 없어졌다.
위 설계에서 이 컬럼을 "저장한다"고 한 부분은 다음으로 바뀐다.

- 본문 HTML: 읽을 때 `ContentRenderer`로 만들고 `RenderedHtmlCache`가 `render:post:{id}:{edit_version}:{렌더 규칙 버전}` 키로 Redis에 7일 캐시한다. Redis가 안 되면 매번 렌더링한다.
- 목록 요약: `left(content_md, 600)`을 읽어 `ContentRenderer.excerpt`로 만든다.
- 대표 사진: `post_image`에서 가장 작은 position의 사진 썸네일. 발행 때 `PostImageLinker`(PublishExtension)가 본문 사진을 순서대로 연결한다.
- 수: `post_stat` 뷰. SQL 조각은 `post/infra/PostSql`에 모았다.
- API 응답 모양은 바뀌지 않았다.
