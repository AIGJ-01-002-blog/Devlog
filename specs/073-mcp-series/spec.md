# Feature Specification: AI 연결(MCP)로 시리즈와 포트폴리오 프로젝트 다루기

**Feature Branch**: `073-mcp-series`
**Created**: 2026-10-09
**Status**: Implemented (v1.49.0)
**근거**: 2026-10-09 블로그 주인 요청("이 방식을 나의 블로그 쓰는 스레드한테 넘겨서 접목시켜줘"). 072 3단계 포트폴리오 모드를 AI가 쓸 수 있게 한다. 071의 범위 밖 "시리즈 묶기"를 채운다.

## 사용자 시나리오

1. **Given** 쓰기 토큰으로 연결한 AI, **When** `create_series`로 "devlog 만들기"를 만들고 `add_to_series`로 글을 넣으면, **Then** 웹의 "+ 새 시리즈"·시리즈 고르기와 같게 시리즈가 생기고 글이 맨 뒤에 붙는다. `position`을 주면 그 번째(1부터)에 놓이고, 이미 든 글은 자리만 옮긴다.
2. **Given** 임시글, **When** `add_to_series`로 넣으면, **Then** 맨 뒤에 들어가고 발행한 뒤 시리즈에 보인다. 순서는 발행한 글끼리 매긴다.
3. **Given** "AI가 발행·삭제하도록 허용"을 켠 회원, **When** `set_series_project`로 portfolio=true와 프로젝트 칸을 적으면, **Then** `/@handle/portfolio`에 그 프로젝트와 공개 글이 보인다. 주지 않은 칸은 그대로, 빈 문자열은 지운다.
4. **Given** 허용하지 않은 회원, **When** `set_series_project`를 부르면, **Then** 목록에 없고 불러도 "허용을 켜야 한다"는 오류다.

## Requirements

- **FR-001**: 도구 `list_series`(읽기), `create_series`·`add_to_series`(쓰기)는 다른 쓰기 도구와 같은 규칙(WRITE 토큰, 이메일 인증, 한 시간 30번)을 따른다.
- **FR-002**: `set_series_project`는 쓰기 도구이면서 누구나 보는 화면을 바꾸므로 `publish_post`와 같은 AI 발행 허용 관문을 둔다.
- **FR-003**: 도구는 웹과 같은 서비스를 부른다: 만들기 `SeriesService.create`, 넣기 `SeriesService.placeAt`(= `assign` + `reorder`), 프로젝트 `SeriesProjects.save`(길이·기술 개수·중복 제거 검증 그대로).
- **FR-004**: 남의 시리즈·남의 글은 없는 것과 같다(오류 문장).
- **FR-005**: 연결 안내(initialize)에 "포트폴리오 글은 고른 프로젝트 시리즈에 넣고, 보이려면 set_series_project(제 역할은 사용자 확인)"를 적는다. 개발 일지는 지금처럼 시리즈로 묶지 않는다.

## 고른 기본값 (질문 없이 정함)
- 시리즈 이름 칸은 `series_name`이다(도구 목록 JSON의 `name` 키와 겹치지 않게).
- 시리즈 빼기·이름 바꾸기·지우기 도구는 만들지 않았다(요청 범위 밖, 웹에서 한다).
