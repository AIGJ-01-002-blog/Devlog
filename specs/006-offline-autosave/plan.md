# 구현 메모: 006 브라우저 저장·오프라인 복구 (v0.6.0)

화면만 바뀌었다(서버 변경 없음). 발행 때 업로드 대기 표시(`](local:…)`)를 거부하는 검사는 002에서 이미 서버에 있다(`PENDING_IMAGES`).

## 구조
| 파일 | 역할 |
|---|---|
| `lib/localDrafts.ts` | IndexedDB `blog-local`: `drafts`(키 [회원, 글]), `backups`(키 [회원, 글, 시각], 7일), `pendingImages`(009가 채운다). 못 쓰는 환경이면 조용히 아무것도 안 함 |
| `lib/restore.ts` | 다시 열 때 판단: 없음·지움(미전송 없음, 또는 서버와 같음)·불러옴(출발 버전 = 서버 버전)·충돌 |
| `lib/autosave.ts` | `retryNow()`(online 이벤트), `markConflict()`(열자마자 충돌) 추가 |
| `pages/WritePage.tsx` | 1초 멈춤마다 기기 저장, 서버 저장 뒤 미전송 여부 갱신, 떠날 때·발행 뒤 지우기, 충돌 중 [저장]·[발행] → 비교 창, 백업 목록 |
| `lib/auth.tsx` | 로그아웃 때 `clearMember`, 앱 시작 때 7일 지난 백업 정리 |

## 결정
- 떠날 때 보낸 마지막 저장(keepalive)의 성공 여부를 알 수 없어 기기 데이터를 남긴다. 다시 열었을 때 내용이 서버와 같으면 충돌로 보지 않고 지운다.
- 백업 목록에서 [불러오기]를 하면 지금 내용도 먼저 백업한다(어느 쪽도 모르게 사라지지 않게, FR-013).
- 사진 대기열(US4)은 저장소만 만들어 두고 실제 올리기는 009에서 붙인다.

## 확인
- 단위: localDrafts(fake-indexeddb), restore, Autosaver retryNow·markConflict
- 브라우저: 오프라인 쓰기 → 창 닫기 → 다시 열어 복구·동기화, 재연결 자동 동기화, 두 탭 충돌 → 불러오기 → 백업 확인, 로그아웃 뒤 IndexedDB 0건
