# Changelog

버전은 [Semantic Versioning](https://semver.org/lang/ko/)을 따른다.
MVP(로그인·글쓰기·글 읽기 + 화면)를 실제로 쓸 수 있을 때 1.0.0을 내고, 그 전에는 0.x에서 기능이 늘면 Minor, 수정만 있으면 Patch를 올린다.
1.0.0 이후 호환이 깨지는 API·스키마 변경은 Major다.

main에 이 파일의 맨 위 버전이 새로 들어오면 `.github/workflows/release.yml`이 태그(`v버전`)와 GitHub Release를 만든다.

## [0.1.0] - 2026-10-07

블로그 앱 백엔드 첫 릴리스 (spec 001~003, PR #2·#3).

### 추가
- GitHub 가입·로그인, 블로그 주소(`gi-아이디`)·닉네임 규칙, 약관 재동의, 정지·탈퇴 상태 처리, 로그인 시도 제한
- Markdown 글쓰기: 새 글, 자동 저장(다른 탭·기기 충돌 감지), 수동 저장, 발행·다시 발행(연타 방지), 변경 취소, 공개·비공개 전환, 미리보기
- 내 글 관리 목록(임시글·발행 글, 20개씩)
- 글 상세, 홈 최신 글, 개인 블로그 목록(9개씩), 링크 미리보기 머리말(정규 주소·OG·noindex)
- 본문 정화: 공격 문자열 32개 차단 확인
- 쿠버네티스 배포 준비: 헬스 프로브, `DB_SCHEMA`, graceful shutdown, `mvnw`

### 알려진 제약
- 화면(React)은 아직 없다 (다음 릴리스)
- 저장소 GitHub Actions가 꺼져 있어 세션에서 `./mvnw clean verify`로 검증했다 (테스트 120개 통과)
