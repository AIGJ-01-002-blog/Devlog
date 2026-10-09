-- spec 070: 유입 경로와 많이 본 화면. 하루 단위로 모은 수만 남긴다(사람별 기록 없음).
-- 유입 경로: 새 방문(30분 넘게 쉬었다 온 것 포함)마다 어디서 왔는지. host는 source='other'일 때만 채운다.
CREATE TABLE visit_source_day (
    day date NOT NULL,
    source varchar(20) NOT NULL,
    host varchar(100) NOT NULL DEFAULT '',
    visits integer NOT NULL CHECK (visits > 0),
    PRIMARY KEY (day, source, host)
);

-- 많이 본 화면: 화면을 열 때마다(블로그 안에서 옮겨 다닐 때 포함). 정해 둔 화면 주소 모양만 남긴다.
CREATE TABLE page_view_day (
    day date NOT NULL,
    path varchar(200) NOT NULL,
    views integer NOT NULL CHECK (views > 0),
    PRIMARY KEY (day, path)
);
