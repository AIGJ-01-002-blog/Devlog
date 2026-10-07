# Tasks: 읽기·공유 (003-read-share)

- [X] T001 `PostAccessPolicy`·`VisibilityRule`(PUBLIC·PRIVATE)·`Viewer`
- [X] T002 `GET /api/posts/{id}` 상세(작성자에게 수정 중·숨김 정보), 캐시 헤더
- [X] T003 `GET /api/posts`, `GET /api/members/{handle}`, `GET /api/members/{handle}/posts` (9개, 커서)
- [X] T004 `PageController`: `/`, `/@handle`, `/@handle/posts/{id}`(301·302·404 순서), 로그인 화면 등 SPA 주소, 머리말·첫 화면 HTML
- [X] T005 테스트: 상세·링크 미리보기, 볼 수 없음 동일 응답, 301/302, 수정 중, 숨김, 홈·블로그 정렬·페이지, 커서 위조, 탈퇴, 인덱스
- [ ] T006 React: 홈 카드 목록([더 보기], 30분 복원), 개인 블로그, 글 상세(코드 강조, 작성자 버튼)
