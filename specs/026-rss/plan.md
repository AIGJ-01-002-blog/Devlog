# 구현 메모: 026 RSS (v1.15.0)

| 파일 | 역할 |
|---|---|
| `discovery/application/RssFeed` | 공개 목록 조건으로 20개를 한 번에 읽어 RSS 2.0 XML을 만든다. 제목·요약은 XML 이스케이프하고 XML 1.0에 쓸 수 없는 제어 문자는 뺀다. `atom:link rel=self`, `dc:creator` |
| `discovery/web/RssController` | `GET /rss`, `GET /@{handle}/rss`. `public, max-age=600` |
| `SpaShell.render(…, rssPath)` | 수집하는 화면 머리에 RSS 주소. 블로그는 그 블로그 RSS, 나머지는 `/rss` |
| `BlogPage` | 프로필 줄 [RSS] 링크 |

## 결정
- 본문 전체 대신 요약만 넣는다. 목록 쿼리 비용(본문 앞 600자) 그대로이고, 독자를 블로그로 데려온다(조회수·댓글).
- 인증·보는 사람에 따른 차이를 두지 않는다(공개 글만). 그래서 공유 캐시를 쓴다.

## 확인
- 서버 `RssTest`: 공개 글만 최신순, 잘 짜인 XML(이스케이프), 콘텐츠 형식·캐시 헤더, 없는 블로그 404, 블로그 첫 화면의 alternate 링크
