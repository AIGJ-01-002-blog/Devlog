-- 포트폴리오 모드 (spec 072 3단계). 포트폴리오에 보이기로 한 시리즈가 프로젝트다. 시리즈에 프로젝트 설명 칸을 더한다(헌법 I: 추가만).
ALTER TABLE series
    ADD COLUMN portfolio          boolean NOT NULL DEFAULT false,
    ADD COLUMN project_period     varchar(40),
    ADD COLUMN project_summary    varchar(200),
    ADD COLUMN project_tech       varchar(400),
    ADD COLUMN project_team_work  varchar(2000),
    ADD COLUMN project_my_role    varchar(2000);

COMMENT ON COLUMN series.portfolio IS '포트폴리오에 프로젝트로 보이는지';
COMMENT ON COLUMN series.project_period IS '프로젝트 기간 (자유 형식, 예: 2026.03 ~ 2026.10)';
COMMENT ON COLUMN series.project_summary IS '프로젝트 한 줄 설명';
COMMENT ON COLUMN series.project_tech IS '쓴 기술 (쉼표로 나눈 목록)';
COMMENT ON COLUMN series.project_team_work IS '우리 팀이 한 일';
COMMENT ON COLUMN series.project_my_role IS '제 역할 (작성자가 맡은 부분)';
