# ERD Cloud 확인 체크리스트

ERD Cloud "ai blog"가 **기준(최신)** 이다. 2026-10-06 강성찬 변경(신고 분리·동의·정지 이력, 이름 규칙, 기능 영역 7색) 이후 상태를 [V1](./V1__common_schema.sql)·[51 통합 명세](https://github.com/AIGJ-01-002-blog/docs/blob/main/design/51-erd-unified.md)에 반영했다.

> 기준 파일: [ERD Cloud 내보내기 원본](./erdcloud-export.sql)(2026-10-07 회의 반영 뒤) · 20개 테이블 · 148개 컬럼 · 관계선 **40개**.
> 자동 대조 결과 (2026-10-07): 테이블·컬럼(이름·타입·NULL·기본값)·FK 40개 모두 일치. 차이는 ERD Cloud 그리기 제약 4곳뿐이다(아래 "그대로 두는 차이").

## 이미 확인된 것 (자동 대조, 2026-10-06)

- [x] 테이블 20개, 컬럼 148개가 V1과 같다.
- [x] 컬럼 타입·NULL·기본값이 V1과 같다.
- [x] PK 20개, FK 40개의 컬럼과 참조 테이블이 V1과 같다.
- [x] `friendship.requested_by` → `member` FK가 있다.
- [x] 신고 사건(`report_case`)·신고(`report`)·회원 정지 이력(`member_suspension`)·회원 동의(`member_agreement`)가 V1과 같다.

## 그대로 두는 차이 (ERD Cloud가 그릴 수 없음)

| 곳 | ERD Cloud 그림 | 실제 DDL (V1) |
|---|---|---|
| `post_view_daily` PK 순서 | (view_date, post_id) | (post_id, view_date) |
| `member_agreement` PK 순서 | (type, member_id) | (member_id, type) |
| `notification_mute` PK 순서 | (type, member_id) | (member_id, type) |
| 댓글 부모 관계 | `parent_id` 단일 선 | `(post_id, parent_id)` → `comment (post_id, id)` 복합 FK |

UNIQUE·CHECK·ON DELETE·인덱스는 ERD Cloud 설명 칸에만 있다. 정의는 V1이 기준이다.

## 사람이 확인할 것

- [x] **ERD Cloud 다시 내보내기:** 2026-10-07 회의 반영 뒤 내보내기로 교체, V1과 일치

- [ ] **한글 논리명:** ERD Cloud 내보내기에 논리명이 없어서 V1·51은 변경 내역 §5 규칙으로 맞췄다. ERD Cloud 화면과 51 §2 논리명이 다르면 ERD Cloud 쪽을 51·V1에 옮긴다. 특히 `report.case_id`(51에서는 "신고 사건 번호")는 변경 내역에 이름이 없었다.
- [ ] **댓글 부모 메모:** ERD Cloud `comment` 설명 칸에 "부모 FK는 (post_id, parent_id) 복합" 한 줄을 넣는다.
- [x] **ERD Cloud에 없는 V1 제약:** CHECK·인덱스 모두 채택 (2026-10-07 E7). 오늘 더한 `uq_image_profile_current`·`uq_report_case_open_*`·`ck_member_agreement_version` 포함

## 팀 결정이 필요한 것

- [x] 신고 분리(`report_case` + `report`) 채택 (2026-10-07 E1) → 03·43·44·13·25 문서 수정 필요. 자기 신고 금지는 Service 검사(E8)
- [x] 동의 분리(`member_agreement`) 채택 + `version` 컬럼 (2026-10-07 E2·H9) → 03·07·34 문서 수정 필요. ERD Cloud에 "동의 버전" 추가됨
- [x] ERD Cloud 회원에 "최근 활동 일자"·"최근 활동 공개 여부" 추가됨 (2026-10-07)
- [x] 정지 이력 분리(`member_suspension`) 채택 (2026-10-07 E3) → 03·42·43 문서 수정 필요. 회원당 열린 정지 1개는 Service 규칙(E5)
- [x] 한 대상에 대기 중 신고 사건 1개를 DB로 막음 (2026-10-07 E4, `uq_report_case_open_*`)
- [x] 탈퇴 30일 익명 처리 때 회원 동의·정지 이력은 유지 (2026-10-07 E6) → 13 §3-3·44 §4 순서표에 "유지" 명시 필요
