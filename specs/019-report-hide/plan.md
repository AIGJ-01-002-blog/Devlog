# 구현 메모: 019 신고·숨김·정지 (v1.8.0)

## 구조
| 파일 | 역할 |
|---|---|
| `moderation/application/ReportService` | 신고 접수: 1분 5건·하루 50건(429) → 볼 수 있는 대상인지(404) → 자기 것(400 `CANNOT_REPORT_OWN`) → 기타면 설명 필수 → 대상별 대기 사건 하나(`ON CONFLICT ... WHERE status='PENDING'`) → 회원별 신고 하나(`ON CONFLICT (case_id, reporter_id)`). 사건이 처음 생길 때만 스냅샷(글: 제목 + 본문 앞 2,000자, 댓글: 전체) |
| `moderation/application/ModerationService` | 처리(숨기기·반려): 사건 행 잠금 → 이미 처리면 409 `CASE_ALREADY_HANDLED` → 자기 콘텐츠면 400 `CANNOT_HANDLE_OWN` → 대상 `hidden_at/by/reason` → 대기 신고 모두 같은 결과. 숨김 해제 |
| `moderation/application/SuspensionAdminService` | 정지(1/7/30일·영구, 사유 200자 필수)·해제. 관리자·자기 자신 정지 불가, 열린 정지는 하나(409 `ALREADY_SUSPENDED`), 기한 지난 열린 정지는 닫고 새로 연다. 커밋 뒤 그 회원의 세션을 모두 지운다 |
| `moderation/application/AdminReportQuery` | 목록([대기] 신고 수 많은 순 → 최근 순, [처리됨] 처리 최근 순, 20개씩 커서), 처리 화면(대상 상태·주소·스냅샷·사유별 수·기타 설명, 신고자 정보 없음, 작성자 정보·숨김 수·정지 이력), 회원 화면 |
| `moderation/application/ReportPurgeJob` | 매일 05:10 한 서버(JobLock): 처리 30일 지난 사건의 스냅샷과 신고 설명을 비운다 |
| `moderation/application/ModerationEvents` | 커밋 뒤 사건: 신고 처리됨, 콘텐츠 숨겨짐·해제됨, 회원 정지됨(사유 글자 없음) |
| `moderation/web/ReportController`, `AdminController` | `POST /api/reports`, `/api/admin/reports…`, `/api/admin/members/{handle}…` |
| `notification` | 신고 처리 결과(신고자마다, 결과는 사건 상태에서 읽음)와 내 콘텐츠 숨김 알림(끌 수 없음). 숨긴 댓글의 댓글 알림은 지운다 |
| 화면 | 글·댓글 [신고] 창, 헤더 "신고 관리"(관리자만), `/admin/reports`, `/admin/reports/{id}`, `/admin/members/{handle}`, 숨김 배너(사유), 알림 문구 |

## 결정
- 숨김 사유는 이미 있는 `post.hidden_reason`·`comment.hidden_reason`을 쓴다. V6에서 "숨겼으면 사유가 신고 사유 코드 중 하나, 안 숨겼으면 비어 있음" 검사를 더했다. 글 엔티티는 숨김 칸을 쓰지 않는다(관리 기능만 바꿈).
- V6: 신고 설명 검사를 "있으면 빈 글자가 아님"으로 바꿨다. 30일 뒤 비우기 위해서다. "기타면 설명 필수"는 접수할 때 앱이 본다.
- 신고 처리 결과(조치함/문제없음)는 따로 저장하지 않고 사건 상태(HIDDEN/REJECTED)에서 읽는다(정규화).
- 관리자 주소 `/admin/**`: 비회원은 로그인으로, 일반 회원은 "찾을 수 없음", 관리자는 화면. API도 같다(보안 설정).
- 같은 대상을 다시 신고해도 "접수됐어요"로 같다(FR-003).
- 숨김 해제는 알리지 않는다(FR-027). 정지 해제는 사건이 없다(FR-041).

## 확인
- 통합 `ReportTest` 7개: 접수·중복·자기 것·볼 수 없는 대상·기타 설명·속도 제한, 처리(숨기기·반려·이중 처리·자기 콘텐츠), 숨긴 글·댓글이 목록·상세·수에서 빠짐과 해제, 정지 → 세션 삭제·로그인 거부·해제, 관리자 정지 불가, 관리자 주소 권한, 30일 뒤 비우기, 알림
- 화면 `moderation.test.ts` 3개, `notifications.test.ts` 신고 문구
- 브라우저: 신고 창(사유 필수·기타 설명), 일반 회원 관리자 주소 404, 관리자 목록·처리, 숨긴 글 남에게 404·작성자 배너, 작성자·신고자 알림, 정지 → 로그아웃, 숨김 해제·정지 해제
