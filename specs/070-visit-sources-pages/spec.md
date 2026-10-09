# Feature Specification: 유입 경로와 많이 본 화면 (관리자 대시보드)

**Feature Branch**: `070-visit-sources-pages`
**Created**: 2026-10-09
**Status**: Implemented (v1.44.0)
**근거**: 9시 보고 질문 4-3에 블로그 주인이 "넣어줘"로 답함. 네이버 서치어드바이저·구글 서치 콘솔을 막 등록해서, 실제 검색 유입이 들어오는지 보는 것이 핵심이다. 방문자 수(064)에 이어진다.

## 사용자 시나리오

1. **Given** 누구든, **When** 블로그 화면을 처음 열면, **Then** 화면이 `POST /api/visits`에 `{first: true, path, referrer}`를 보낸다. referrer는 다른 사이트에서 왔을 때만 보낸다(document.referrer).
2. **When** 블로그 안에서 화면을 옮기면, **Then** `{first: false, path}`를 보낸다. 같은 화면을 잇달아 보내지 않는다.
3. **Given** 새 방문(그날 처음이거나 30분 넘게 쉬었다 온 것, 064와 같은 기준), **Then** 유입 경로를 한 번 센다. 같은 방문 안의 새로 고침은 다시 세지 않는다.
4. **Given** `/admin` 대시보드, **Then**
   - 지표 칸 **검색 유입**(구글·네이버·다음·빙으로 온 방문 수, 이전 기간 대비)과 날짜별 그래프가 있다.
   - **어디서 왔나요**: 검색·SNS·메신저·직접·다른 사이트 비율 한 줄, 그 아래 경로별 방문 수·비율 막대. 다른 사이트는 사이트 이름(호스트)으로 5개까지, 나머지는 '그 밖의 사이트' 한 줄.
   - **많이 본 화면**: 기간 동안 많이 연 화면 10개. 글 화면은 공개 글 제목, 비공개·숨김 글은 "@아이디의 공개하지 않은 글".
5. 로봇·링크 미리보기·미리 불러오기는 세지 않는다. 관리자·매니저는 센다(064와 같다).

## Requirements

- **FR-001**: V22 `visit_source_day(day, source, host, visits)`, 기본 키 `(day, source, host)`; `page_view_day(day, path, views)`, 기본 키 `(day, path)`. 사람별 기록 없이 하루 단위 수만 남고, 400일 뒤 방문 기록과 함께 지운다.
- **FR-002**: 분류(`VisitSources.classify`)는 이전 주소의 호스트로 한다. google·naver·daum·bing(검색), kakao·instagram·facebook·x·youtube·threads·linkedin·line(SNS·메신저), github, direct(이전 주소 없음·이 사이트), other(그 밖, 호스트만 남김). 이전 주소가 없으면 앱 안 브라우저 표시(KAKAOTALK·Instagram·FBAN 등)로 앱을 알아낸다. 원래 주소(검색어·쿼리)는 남기지 않는다.
- **FR-003**: 새 방문 판단은 site_visit UPSERT가 visits를 늘렸는지로 한다(`WITH old AS (…)`로 바꾸기 전 값과 비교). 방문 수와 유입 경로 수가 같은 기준으로 맞는다.
- **FR-004**: 화면 주소(`VisitSources.page`)는 정해 둔 모양만 남긴다: 홈, 블로그·글·시리즈·소개·팔로워·RSS, 검색·태그·릴리스·문의·로그인·가입·피드·설정 등. 관리자·글쓰기·인증·토큰 화면은 남기지 않는다. 쿼리·# 뒤는 지우고 아이디는 소문자로 맞춘다. 화면 옮기기는 한 사람 1분 60번, 한 IP 1분 300번까지.
- **FR-005**: 값 없이 온 요청(예전 화면)은 첫 방문으로 보고, 유입 경로는 User-Agent만으로 분류한다(대개 직접).
- **FR-006**: 대시보드 응답에 `current/previous.searchVisits`, `daily[].searchVisits`, `sources[]`, `topPages[]`를 더한다. 집계는 view 모듈 `ViewStats`, 글 제목은 post 모듈 `PostStats`에서 받고 admin 모듈은 조립만 한다(헌법 IV).

## 갈림길과 고른 안 (9시 보고에 남김)
- 유입 경로는 **새 방문마다 한 번**(사람 수 아님). 같은 사람이 아침엔 검색, 저녁엔 카카오톡으로 오면 둘 다 센다.
- 네이버는 검색·블로그·카페를 모두 '네이버'로 묶는다. 검색만 따로 보려면 다음 단계로 나눌 수 있다.
- 화면 순위는 화면을 열 때마다 센다(조회수처럼 하루 한 번으로 거르지 않음).
