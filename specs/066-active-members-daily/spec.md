# Feature Specification: 날짜별 활동한 회원 (관리자 대시보드)

**Feature Branch**: `066-active-members-daily`
**Created**: 2026-10-09
**Status**: Implemented (v1.40.0)
**근거**: 블로그 주인 요청 "관리자 페이지에 있는 활동한 회원도 대시보드로 일일 방문자 수처럼 그래프화해서 보여줘".

## 사용자 시나리오

1. **Given** `/admin` 대시보드, **Then** "활동한 회원"이 방문자·방문처럼 누를 수 있는 지표 칸이 되고, 누르면 날짜별 막대그래프(그날 활동한 회원 수)가 보인다. 칸의 값은 기간 동안 하루라도 활동한 회원 수이고 이전 같은 기간 대비 %가 붙는다.
2. **Given** 회원이 로그인한 채로 블로그를 쓰면(로그인한 요청, 지금 "최근 활동"과 같은 기준), **Then** 그날(한국 날짜) 활동한 회원으로 한 번 남는다. 같은 날 여러 번 와도 한 번이다.
3. 그래프 아래에 "날짜별 활동 기록은 v1.40.0부터 쌓여요"를 알린다. 그 전 날짜에는 회원마다 마지막으로 활동한 날만 채워져 있다.

## Requirements

- **FR-001**: V21 `member_active_day(member_id, day)`, 기본 키 `(day, member_id)`, 회원이 완전히 지워지면 함께 지운다. 처음에는 `member.last_active_at`의 날짜를 한 행씩 채운다.
- **FR-002**: `ActivityTracker.touch`가 그날 처음일 때 `INSERT … ON CONFLICT DO NOTHING`. Redis 키 `active-day:{회원}:{날짜}`(25시간)로 하루 한 번만 쓰고, Redis가 멈추면 겹쳐도 무시되는 INSERT만 한다.
- **FR-003**: 대시보드 응답 `current/previous.activeMembers`(기간 안 서로 다른 회원 수), `daily[].activeMembers`. 집계는 account 모듈의 `MemberStats`(헌법 IV).
- **FR-004**: 400일이 지난 행은 매일 04:45(KST)에 지운다(`blog.account.active-day-purge-cron`).

## 갈림길과 고른 안 (9시 보고에 남김)
- 세는 기준: **지금 "활동한 회원"과 같은 기준(로그인한 요청)**. 관리자·매니저도 회원이므로 센다(방문자 수와 다름). 이유: 기존 칸의 숫자와 그래프가 같은 뜻이 되게.
- 지난 기록: 날마다 남긴 기록이 없어 **마지막 활동일만 채움**. 그래프는 오늘부터 정확해진다.
