# 구현 메모: 015 알림 (v1.4.0)

## 구조
| 파일 | 역할 |
|---|---|
| `notification/application/NotificationType` | 종류와 끌 수 있는 종류(댓글·답글·좋아요·새 팔로워·새 글) |
| `notification/application/NotificationService` | 사건 → 알림 만들기. 본인·탈퇴 유예·끔·읽기 권한 확인, 좋아요 묶음(잠금 + 현재 상태 재확인), 취소 시 묶음에서 빼기 |
| `notification/application/NotificationEventListener` | 댓글 작성·삭제, 좋아요·취소 사건을 커밋 뒤 비동기로 받는다. 실패는 기록만 하고 원래 요청에 영향 없음 |
| `notification/application/NotificationAsyncConfig` | 알림 전용 실행기(2개, 대기 1,000개, 넘치면 버리고 경고). 시험 설정은 동기 |
| `notification/application/NotificationQuery` | 목록(쿼리 한 번), 안 읽은 수, 읽음·모두 읽음·삭제, 설정 |
| `notification/application/NotificationCleanupJob` | 매일 04:30(KST) 한 서버에서 90일 지난 것과 사람당 1,000개 넘는 것 정리 |
| `notification/web/NotificationController` | `/api/me/notifications`, `/unread-count`, `/{id}/read`, `/read-all`, `DELETE /{id}`, `/api/me/notification-settings`. 모두 `no-store` |
| `db/migration/V5__notification_target_cleanup.sql` | 대상(댓글·글·신고·신고 건)이 지워지면 부모 알림도 지우는 트리거. 테이블 변경 없음 |
| 화면 `components/NotificationBell.tsx`, `components/NotificationEntry.tsx`, `pages/NotificationsPage.tsx`, 설정 `NotificationsSection`, `lib/notifications.ts` | 종·배지·펼침 목록, 전체 페이지, 끄기 |

## 결정
- 이번 범위는 댓글·답글·좋아요 알림이다. 새 팔로워·새 글은 016(팔로우), 신고 결과·숨김은 019에서 사건을 붙인다. 설정 화면에는 팔로워·새 글 끄기를 미리 둔다.
- 알림 만들기는 출처 트랜잭션 커밋 뒤(`@TransactionalEventListener`) 별도 실행기에서 자기 트랜잭션(`REQUIRES_NEW`)으로 한다. 사건 순서에 기대지 않고 처리할 때 `post_like`·댓글·글 상태를 다시 읽는다(FR-044).
- 좋아요 묶음: `(받는 사람, LIKE, 글)` 트랜잭션 잠금(`pg_advisory_xact_lock`)으로 안 읽은 묶음을 하나로 유지한다. 같은 사람은 그 글의 좋아요 알림 전체에서 한 번만(FR-009). 수와 대표는 저장하지 않고 `notification_actor`에서 센다(정규화 v3 원칙).
- 알림 대상 연결 행은 대상이 지워질 때 FK로 같이 지워지는데, 부모 `notification`이 남는 문제를 V5 트리거로 막았다. 앱 코드에서 따로 지울 필요가 없다.
- 보여줄 때 지금의 닉네임·제목·댓글을 읽고, 지금 읽을 수 없는 글이면 제목·내용·링크를 뺀다(`PostAccessPolicy.canRead`).
- 헤더 배지는 30초마다 세고 탭이 가려지면 멈춘다. 알림 페이지에서 읽음·삭제하면 브라우저 사건(`notifications:changed`)으로 배지가 바로 다시 센다.
- 텔레그램 알림은 같은 사건을 받는 별도 채널로 뒤에 붙인다(토큰이 없으면 꺼짐).

## 확인
- 통합 `NotificationTest` 9개: 댓글·답글 대상 규칙, 좋아요 묶음·취소·읽은 뒤 새 묶음, 동시 좋아요 10개, 볼 수 없는 글 표시, 탈퇴한 사용자, 댓글 삭제·글 완전 삭제 정리, 끄기, 본인만 읽음·삭제(관리자도 404), 10·20개 커서, 정리 작업
- 화면 `notifications.test.ts` 3개
- 브라우저: 다른 사람의 댓글·좋아요 → 배지 2 → 펼침 목록(HTML은 글자로) → 눌러 댓글 위치로 이동, 배지 1 → 알림 페이지 모두 읽음·삭제(새로고침 뒤 유지) → 설정에서 좋아요 끄기 저장 → 새 회원 빈 상태
