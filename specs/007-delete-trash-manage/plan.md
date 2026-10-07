# 구현 메모: 007 글 삭제·휴지통·관리 (v0.7.0)

휴지통 목록(`GET /api/me/posts?tab=TRASH`, 삭제일·완전 삭제 예정일·탭별 개수)과 "삭제된 글은 어디에도 안 보임"은 002·003에서 이미 있었다. 이번에는 삭제·복구·완전 삭제와 30일 정리를 붙였다.

## 구조
| 파일 | 역할 |
|---|---|
| `post/application/PostTrashService` | 삭제·복구·영구 삭제. 작성자 본인 글을 `FOR UPDATE`로 잠그고 하나씩 처리. 빈 임시글은 바로 삭제 |
| `post/application/TrashPurgeJob` | 매일 04:30 KST, JobLock. 500개씩, 글마다 `FOR UPDATE SKIP LOCKED`로 다시 확인 |
| `post/application/PurgeExtension` | 완전 삭제 직전 훅. 탈퇴 정리(020)도 같은 절차를 쓴다 |
| `media/PostImagePurgeHook` | 다른 글이 쓰지 않는 사진·첨부파일에 연결 해제 시각을 남긴다(7일 뒤 정리) |
| `moderation/ReportCasePurgeHook` | 대기 중 신고를 `CLOSED_NO_TARGET`으로 종료(처리자 없음) |
| `post/application/PostLifecycleEvents` | PostTrashed·PostRestored·PostPurged(사유 USER·EXPIRED·EMPTY·WITHDRAW). 글자는 담지 않는다 |
| `AutosaveFlushJob.flushPost` | 삭제 직전 그 글의 Redis 자동 저장분을 DB에 반영. Redis가 멈춰도 삭제는 계속 |
| 화면 `lib/trash.ts`, `ManagePage`, `PostPage` | 휴지통 탭, [삭제]·[복구]·[영구 삭제], 확인 문구, 행·개수만 갱신 |

## 결정
- 삭제·복구는 `updated_at`을 바꾸지 않는다. 복구하면 목록의 원래 자리로 돌아온다(휴지통 탭은 삭제 시각 순).
- 댓글·좋아요·태그·조회 기록·작업본은 FK `ON DELETE CASCADE`로 함께 지운다. 신고 사건은 `SET NULL`이라 기록이 남는다.
- 삭제·복구·영구 삭제는 이메일 인증 전에도 허용한다(004 FR-008: 내 데이터를 정리하는 동작은 막지 않는다).
- 세 API는 회원별 1분 60번 제한.

## 확인
- 통합 테스트 `TrashTest` 10개: 휴지통 이동·숨김, 반복·동시 삭제, 빈 임시글, 자동 저장 반영, 남의 글 404, 복구 위치, 영구 삭제 연쇄·신고 종료, 사진 정리 대상, 30일 정리
- 브라우저: 글 화면 [삭제] → 휴지통 탭 → [복구] → 발행 글 탭 → 목록 [삭제] → [영구 삭제], 빈 임시글 바로 삭제
