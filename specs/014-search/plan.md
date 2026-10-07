# 구현 메모: 014 검색 (v1.3.0)

## 구조
| 파일 | 역할 |
|---|---|
| `search/application/SearchTerms` | 검색어 처리: NFC, 50자, 띄어쓰기, 1글자 무시, 5단어, ILIKE 이스케이프, 강조 정규식, 커서용 지문 |
| `search/application/SearchQuery` | 단계 조건, 최근창 → 인덱스 후보 실행, 단계 넘어 9개 채우기, 카드 읽기, 사람 검색 |
| `search/application/Snippet` | 검색어 주변 앞뒤 40자, 조각마다 이스케이프 + `<mark>` |
| `search/web/SearchController` | `GET /api/search/posts`·`/api/search/people`, 1분 30번 제한(조회수와 같은 방문자 구분), `no-store` |
| `page/PageController` | `/search` 서버 화면(noindex, 첫 결과), `/@주소?q=` noindex |
| `shared/markdown/ContentRenderer.searchText` | 결과 문장용 본문 글자(코드 블록 포함) |
| 화면 `lib/search.ts`, `pages/SearchPage.tsx`, `components/SearchBox.tsx` | 검색창, 탭, 정렬, 안내, 사람 목록. `PostCard`가 `snippetHtml`을 그린다 |

## 결정
- 공개 범위는 `PostAccessPolicy.PUBLIC_LIST_CONDITION` 하나만 쓴다. 친구가 검색해도 친구 공개 글은 나오지 않는다(docs/06 §3).
- 단계 조건 SQL: ① 모든 단어 `title ILIKE` → ② 모든 단어 (제목 OR 태그) AND NOT ① → ③ 모든 단어 (제목 OR 태그 OR 본문[3글자 이상]) AND NOT ②. 2글자 단어만 있으면 ③을 건너뛴다.
- 실행: 단계마다 커서 이후 최근 공개 글 `recent-window`(3,000)개 안에서 먼저 찾고, 모자라면 가장 긴 단어로 제목·태그·본문 후보를 각각 모아(UNION) 전체에서 찾는다. 최근창 결과는 전체 결과에 들어 있으므로 그대로 바꿔 쓴다.
- 카드는 찾은 번호로 한 번에 읽고, 이때도 공개 조건을 다시 확인한다(두 쿼리 사이에 비공개가 된 글은 빠짐).
- 커서는 `{단계, 처음 공개 시각(µs), 번호}`이고 목록 이름에 정렬·블로그·검색어 지문을 넣어 다른 검색의 커서를 거부한다. 검색어 원문은 커서에 담지 않는다.
- 결과 문장: docs/33은 "전체 이스케이프 → 이스케이프된 검색어에 mark"지만, 그러면 검색어 `amp`가 `&amp;` 안에 걸린다. 원문에서 위치를 찾고 조각마다 이스케이프해 같은 결과를 그런 경우 없이 낸다. `<mark>` 외 태그는 나오지 않는다.
- 요청 제한 키는 조회수의 방문자 해시(회원·`vid` 쿠키·IP+브라우저+그날 비밀값)라 IP가 저장소 키에 남지 않는다. 저장소가 멈추면 제한하지 않는다(H8).
- 운영 기록은 DEBUG 수준에서 검색어 길이와 걸린 시간만.
- `pg_trgm`이 없는 DB(V2 실패)에서는 같은 SQL이 인덱스 없이 동작한다.
- `#spring` 입력을 태그 페이지로 보내는 것(A-3)은 하지 않았다. `#`도 글자로 찾는다.

## 확인
- 통합 `SearchTest` 9개: 공개 범위(비회원·친구·본인), 블로그 안 검색, 2글자·1글자, 여러 단어 AND, `%`·`_`·`\`, 대소문자, 결과 문장 이스케이프·코드 블록, 단계 순서와 끝까지 넘기기(관련도·최신, 시험 설정 최근창 5개라 인덱스 경로 포함), 도중 비공개 전환, 고친·다른 검색 커서 400, 사람 검색, 1분 30번, 서버 화면 noindex·no-store
- 단위 `SearchTermsTest` 3개: 정규화·자르기·단어 수·지문, LIKE 이스케이프, 결과 문장(엔티티 안 강조 없음, 40자, 이모지)
- 화면 `search.test.ts` 3개
- 브라우저: 머리말 돋보기 → 검색 → 제목 글이 먼저, 강조, `<script>`는 글자로(대화상자 없음), 새로고침 noindex, 2글자·1글자 안내, 사람 탭 → 블로그, 블로그 안 검색
