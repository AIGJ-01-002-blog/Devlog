# 구현 메모: 010 태그 (v0.10.0)

## 구조
| 파일 | 역할 |
|---|---|
| `tag/application/TagNormalizer` | 정규화(NFKC → 보이지 않는 글자 제거 → 맨 앞 # → 소문자 → 공백은 - → - 정리)와 형식·금칙어 검사. 주소·필터·자동완성은 형식 검사까지만 쓴다 |
| `tag/application/PostTagger` | 발행 확장(PublishExtension). 검사는 트랜잭션 밖에서 `tags[i]`별 오류를 모두 모으고, 발행 트랜잭션에서 `post_tag`를 통째로 바꾼다. 새 태그는 이름 순 `INSERT … ON CONFLICT DO NOTHING` |
| `tag/application/TagQuery` | 글의 태그, 태그 공개 글 수, 전체 태그(Redis `tags:top` 10분), 자동완성, 블로그 태그 줄 |
| `discovery/application/FeedQuery.tag`, `blog(handle, tag, cursor)` | 태그별 목록과 블로그 필터. 홈과 같은 카드·커서, 목록 이름에 태그를 넣어 다른 목록의 커서를 거부한다 |
| `tag/web/TagController`, `page/PageController` | API와 화면 주소(`/tags`, `/tags/{이름}`, `/@주소?tag=`), 301·404 처리, 첫 화면 HTML |
| 화면 `lib/tags.ts`, `components/TagInput.tsx`, `pages/TagsPage`, `pages/TagPage`, `BlogPage`, `PostPage` | 칩 입력·자동완성, 태그 페이지, 블로그 태그 줄, 글 상세 태그 |

## 결정
- 수의 기준은 모두 공개 목록 조건(`PostAccessPolicy.PUBLIC_LIST_CONDITION`)이다. 공개 글이 없는 태그와 없는 태그는 같은 응답이다.
- 태그 수·목록용 컬럼을 따로 두지 않는다(정규화 v3 원칙). 1만 건 기준에서는 `post_tag(tag_id, post_id)` 인덱스로 충분하다(A-7).
- 자동완성의 `_`는 LIKE 와일드카드라 이스케이프한다.
- 발행하지 않고 닫은 태그는 이 화면에 있는 동안만 남는다. 기기 보관(A-5)은 하지 않았다.
- 전체 태그 목록은 10분 캐시라 새 태그가 바로 보이지 않을 수 있다(FR-024 허용).
- 검색창 `#태그` 이동과 AI 태그 추천은 014·018에서 같은 `TagNormalizer`를 쓴다.

## 확인
- 단위 `TagNormalizerTest` 31개: docs/22 §2-1 예시 전체, 터키어 지역 설정, 30자 경계
- 통합 `TagTest` 9개: 정규화·순서·다시 발행 미리 채우기·수정됨, 오류 모두 알림·금칙어 비노출·개수, 공개 조건(비공개·휴지통·숨김·탈퇴), 비공개 전용 태그 구별 불가, 실제 보안 필터를 거친 주소 왕복·301·404, 글 상세 링크 인코딩, 동시 발행 10건, 자동완성 노출 조건·순서·`_`·401, 블로그 태그 줄·필터·301
- 화면 `tags.test.ts` 18개
- 브라우저: 칩 정규화·중복·개수, Alt+방향키·Backspace, 서버 거부 칩 표시, 발행 뒤 상세 태그 링크, 자동완성 선택, 다시 발행 미리 채우기, 태그 페이지(`c%23`, 301), 전체 태그, 블로그 필터·해제
