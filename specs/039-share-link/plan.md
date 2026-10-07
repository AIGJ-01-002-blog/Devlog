# 구현 메모: 039 글 공유 버튼 (v1.17.0)

| 파일 | 바뀜 |
|---|---|
| `lib/share` (새로) | `shareLink(url, title, env)`: 터치 기기면 `navigator.share`, 아니면 `clipboard.writeText`. 결과는 `shared`·`copied`·`cancelled`·`failed`. 브라우저 기능은 `ShareEnv`로 받아 테스트에서 바꿔 끼운다. `absoluteUrl`은 사이트 안 경로를 전체 주소로 |
| `components/ShareButton` (새로) | 버튼 + `role="status"` 안내(3초 뒤 지움). 좋아요 버튼과 같은 모양 |
| `pages/PostPage` | 좋아요 옆에 공유 버튼. 비공개 글은 숨김 |
| `share.test.ts` 6개, `ShareButton.test.tsx` 4개 | 데스크톱 복사, 터치 공유, 공유 창 닫기, 공유 실패 뒤 복사, 복사 불가, 전체 주소(한글 경로 인코딩), 버튼 안내·사라짐, 실패 안내, 다시 누르면 3초 새로, 늦게 끝난 앞 요청이 새 결과를 덮지 않음 |

## 결정
- 데스크톱 Chrome·Safari에도 `navigator.share`가 있지만, 거기서 velog처럼 "링크 복사"를 기대하므로 `(pointer: coarse)`일 때만 공유 창을 쓴다.
- 서버는 바뀌지 않는다. 글 주소는 이미 응답에 있는 `url`을 쓴다.
- 새 기능이라 Minor 버전이다.
- 누를 때마다 결과를 새 객체로 담아, 같은 결과가 다시 나와도 3초를 새로 센다. 요청마다 번호를 매겨 마지막 요청의 결과만 보인다(코드 리뷰 반영).
