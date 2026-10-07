-- V3: 정규화 (2026-10-07 민서님 지적 사항 반영). 의도적 중복을 없애고, 파생 값은 쿼리(뷰)로 구한다.
-- 설계 이유와 성능 대안: /mnt/project-files/crowfoot/normalization-v3.md
--  1) 본문 중복: post.content_html·excerpt·thumbnail_url·render_version 제거. 원본은 content_md 하나, 렌더링 결과는 캐시.
--  2) 댓글 재귀: 답글은 최상위 댓글에만 달린다는 규칙을 FK로 강제 → 재귀 쿼리 없이 인덱스 두 번으로 목록을 읽는다.
--  3) 조회수: 글마다 저장하던 view_count·like_count·comment_count와 일별 합계 post_view_daily 제거.
--     조회 이벤트 post_view를 쌓고 post_stat 뷰로 센다.
--  4) 알림: 종류마다 다른 대상 컬럼(post_id·comment_id·report_id·result·group_key)과 파생 컬럼(last_actor_id·actor_count)을
--     종류별 하위 테이블로 분리. notification은 공통 속성만 남는다.
--  5) 사진 → 리소스: image를 resource(공통)로 바꾸고 resource_image·resource_file(종류별)로 나눈다.
--     글-사진(post_image)과 글-첨부파일(post_file)은 각각 다대다, 프로필 사진은 member_profile_image.
-- V2(pg_trgm 선택 적용)와 독립. ix_post_content_trgm은 content_md에 걸려 있어 영향 없음.

------------------------------------------------------------
-- 1. 글 본문: 원본(content_md)만 저장
------------------------------------------------------------
ALTER TABLE post
    DROP COLUMN content_html,
    DROP COLUMN excerpt,
    DROP COLUMN thumbnail_url,
    DROP COLUMN render_version;

------------------------------------------------------------
-- 2. 댓글: 답글의 부모는 반드시 최상위 댓글 (깊이 1을 선언적으로 보장)
------------------------------------------------------------
ALTER TABLE comment
    ADD COLUMN is_root boolean GENERATED ALWAYS AS (parent_id IS NULL) STORED,
    ADD COLUMN parent_is_root boolean GENERATED ALWAYS AS (CASE WHEN parent_id IS NULL THEN NULL ELSE true END) STORED;

ALTER TABLE comment
    DROP CONSTRAINT fk_comment_parent,
    ADD CONSTRAINT uq_comment_post_id_root UNIQUE (post_id, id, is_root),
    -- (글, 부모, true)가 (글, 댓글, 최상위 여부)를 가리키므로 부모가 답글이면 FK 위반
    ADD CONSTRAINT fk_comment_parent FOREIGN KEY (post_id, parent_id, parent_is_root)
        REFERENCES comment (post_id, id, is_root) ON DELETE CASCADE;

COMMENT ON COLUMN comment.is_root IS '최상위 댓글 여부 (생성 컬럼)';
COMMENT ON COLUMN comment.parent_is_root IS '부모 최상위 표시 (생성 컬럼, FK 전용)';

------------------------------------------------------------
-- 3. 조회수·좋아요 수·댓글 수: 저장하지 않고 센다
------------------------------------------------------------
CREATE TABLE post_view (
    id                     bigint GENERATED ALWAYS AS IDENTITY,
    post_id                bigint NOT NULL,
    viewed_at              timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_post_view_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE
);
-- 글별 조회수(COUNT)와 글별 기간 통계
CREATE INDEX ix_post_view_post ON post_view (post_id, viewed_at);
-- 트렌딩: 최근 N시간 조회 집계
CREATE INDEX ix_post_view_recent ON post_view (viewed_at, post_id);

COMMENT ON TABLE post_view IS '글 조회 (24시간 같은 방문자 중복은 Redis에서 거른 뒤 한 줄)';
COMMENT ON COLUMN post_view.id IS '조회 번호';
COMMENT ON COLUMN post_view.post_id IS '글 번호';
COMMENT ON COLUMN post_view.viewed_at IS '조회 일시';

-- 기존 일별 합계를 이벤트로 옮긴다 (그날 정오 KST로 기록)
INSERT INTO post_view (post_id, viewed_at)
SELECT d.post_id, (d.view_date + time '12:00') AT TIME ZONE 'Asia/Seoul'
FROM post_view_daily d, generate_series(1, d.views);

DROP TABLE post_view_daily;

ALTER TABLE post
    DROP CONSTRAINT ck_post_counts,
    DROP COLUMN view_count,
    DROP COLUMN like_count,
    DROP COLUMN comment_count;

-- 댓글 수 집계용: 보이는 댓글만 (삭제·숨김 제외)
CREATE INDEX ix_comment_visible ON comment (post_id) WHERE deleted_at IS NULL AND hidden_at IS NULL;

CREATE VIEW post_stat AS
SELECT p.id AS post_id,
       (SELECT count(*) FROM post_view v WHERE v.post_id = p.id) AS view_count,
       (SELECT count(*) FROM post_like l WHERE l.post_id = p.id) AS like_count,
       (SELECT count(*) FROM comment c WHERE c.post_id = p.id AND c.deleted_at IS NULL AND c.hidden_at IS NULL) AS comment_count
FROM post p;

COMMENT ON VIEW post_stat IS '글 통계 (조회수·좋아요 수·댓글 수를 쿼리로 계산)';

------------------------------------------------------------
-- 4. 알림: 공통(notification) + 종류별 대상 테이블
------------------------------------------------------------
-- 하위 테이블이 (id, type)을 FK로 가리켜 종류와 하위 테이블이 어긋나지 않게 한다
ALTER TABLE notification ADD CONSTRAINT uq_notification_id_type UNIQUE (id, type);

-- 댓글·답글 알림 → 댓글 (행위자 = 댓글 작성자)
CREATE TABLE notification_comment (
    notification_id        bigint NOT NULL,
    type                   varchar(30) NOT NULL,
    comment_id             bigint NOT NULL,
    PRIMARY KEY (notification_id),
    CONSTRAINT fk_notification_comment_notification FOREIGN KEY (notification_id, type) REFERENCES notification (id, type) ON DELETE CASCADE,
    CONSTRAINT fk_notification_comment_comment FOREIGN KEY (comment_id) REFERENCES comment (id) ON DELETE CASCADE,
    CONSTRAINT ck_notification_comment_type CHECK (type IN ('COMMENT', 'REPLY'))
);
CREATE INDEX ix_notification_comment_comment ON notification_comment (comment_id);

-- 좋아요·새 글 알림 → 글 (좋아요 행위자는 notification_actor, 새 글 행위자 = 글 작성자)
CREATE TABLE notification_post (
    notification_id        bigint NOT NULL,
    type                   varchar(30) NOT NULL,
    post_id                bigint NOT NULL,
    PRIMARY KEY (notification_id),
    CONSTRAINT fk_notification_post_notification FOREIGN KEY (notification_id, type) REFERENCES notification (id, type) ON DELETE CASCADE,
    CONSTRAINT fk_notification_post_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE,
    CONSTRAINT ck_notification_post_type CHECK (type IN ('LIKE', 'NEW_POST'))
);
CREATE INDEX ix_notification_post_post ON notification_post (post_id, type);

-- 신고 처리 결과 알림 → 내 신고 (결과는 신고 사건 상태에서 읽는다)
CREATE TABLE notification_report (
    notification_id        bigint NOT NULL,
    type                   varchar(30) NOT NULL DEFAULT 'REPORT_RESOLVED',
    report_id              bigint NOT NULL,
    PRIMARY KEY (notification_id),
    CONSTRAINT fk_notification_report_notification FOREIGN KEY (notification_id, type) REFERENCES notification (id, type) ON DELETE CASCADE,
    CONSTRAINT fk_notification_report_report FOREIGN KEY (report_id) REFERENCES report (id) ON DELETE CASCADE,
    CONSTRAINT ck_notification_report_type CHECK (type = 'REPORT_RESOLVED')
);
CREATE INDEX ix_notification_report_report ON notification_report (report_id);

-- 내 글·댓글 숨김 알림 → 신고 사건 (대상과 당시 내용은 사건에 있다)
CREATE TABLE notification_case (
    notification_id        bigint NOT NULL,
    type                   varchar(30) NOT NULL DEFAULT 'CONTENT_HIDDEN',
    case_id                bigint NOT NULL,
    PRIMARY KEY (notification_id),
    CONSTRAINT fk_notification_case_notification FOREIGN KEY (notification_id, type) REFERENCES notification (id, type) ON DELETE CASCADE,
    CONSTRAINT fk_notification_case_case FOREIGN KEY (case_id) REFERENCES report_case (id) ON DELETE CASCADE,
    CONSTRAINT ck_notification_case_type CHECK (type = 'CONTENT_HIDDEN')
);
CREATE INDEX ix_notification_case_case ON notification_case (case_id);

COMMENT ON TABLE notification_comment IS '댓글 알림 대상';
COMMENT ON TABLE notification_post IS '글 알림 대상';
COMMENT ON TABLE notification_report IS '신고 결과 알림 대상';
COMMENT ON TABLE notification_case IS '숨김 알림 대상';
COMMENT ON COLUMN notification_comment.notification_id IS '알림 번호';
COMMENT ON COLUMN notification_comment.type IS '알림 종류';
COMMENT ON COLUMN notification_comment.comment_id IS '댓글 번호';
COMMENT ON COLUMN notification_post.notification_id IS '알림 번호';
COMMENT ON COLUMN notification_post.type IS '알림 종류';
COMMENT ON COLUMN notification_post.post_id IS '글 번호';
COMMENT ON COLUMN notification_report.notification_id IS '알림 번호';
COMMENT ON COLUMN notification_report.type IS '알림 종류';
COMMENT ON COLUMN notification_report.report_id IS '신고 번호';
COMMENT ON COLUMN notification_case.notification_id IS '알림 번호';
COMMENT ON COLUMN notification_case.type IS '알림 종류';
COMMENT ON COLUMN notification_case.case_id IS '신고 사건 번호';

-- 기존 데이터 옮기기
INSERT INTO notification_comment (notification_id, type, comment_id)
SELECT id, type, comment_id FROM notification WHERE type IN ('COMMENT', 'REPLY') AND comment_id IS NOT NULL;
INSERT INTO notification_post (notification_id, type, post_id)
SELECT id, type, post_id FROM notification WHERE type IN ('LIKE', 'NEW_POST') AND post_id IS NOT NULL;
INSERT INTO notification_report (notification_id, type, report_id)
SELECT id, type, report_id FROM notification WHERE type = 'REPORT_RESOLVED' AND report_id IS NOT NULL;
INSERT INTO notification_case (notification_id, type, case_id)
SELECT n.id, n.type, rc.id
FROM notification n
JOIN report_case rc ON rc.status = 'HIDDEN'
                   AND ((n.post_id IS NOT NULL AND rc.post_id = n.post_id) OR (n.comment_id IS NOT NULL AND rc.comment_id = n.comment_id))
WHERE n.type = 'CONTENT_HIDDEN'
  AND rc.id = (SELECT max(rc2.id) FROM report_case rc2
               WHERE rc2.status = 'HIDDEN'
                 AND ((n.post_id IS NOT NULL AND rc2.post_id = n.post_id) OR (n.comment_id IS NOT NULL AND rc2.comment_id = n.comment_id)));
-- 대상이 사라져 옮길 곳이 없는 알림은 지운다 (원래도 대상 삭제 시 CASCADE·SET NULL로 의미가 없어진 알림)
DELETE FROM notification n
WHERE n.type <> 'FOLLOW'
  AND NOT EXISTS (SELECT 1 FROM notification_comment x WHERE x.notification_id = n.id)
  AND NOT EXISTS (SELECT 1 FROM notification_post x WHERE x.notification_id = n.id)
  AND NOT EXISTS (SELECT 1 FROM notification_report x WHERE x.notification_id = n.id)
  AND NOT EXISTS (SELECT 1 FROM notification_case x WHERE x.notification_id = n.id);

-- 묶음 알림(좋아요·팔로우)의 마지막 행위자는 notification_actor에도 있게 맞춘다
INSERT INTO notification_actor (notification_id, actor_id, created_at)
SELECT id, last_actor_id, updated_at FROM notification
WHERE type IN ('LIKE', 'FOLLOW') AND last_actor_id IS NOT NULL
ON CONFLICT DO NOTHING;

DROP INDEX uq_notification_unread_group;
DROP INDEX ix_notification_post;
DROP INDEX ix_notification_comment;
DROP INDEX ix_notification_last_actor;

ALTER TABLE notification
    DROP CONSTRAINT ck_notification_group,
    DROP CONSTRAINT ck_notification_result,
    DROP CONSTRAINT ck_notification_count,
    DROP COLUMN post_id,
    DROP COLUMN comment_id,
    DROP COLUMN report_id,
    DROP COLUMN result,
    DROP COLUMN last_actor_id,
    DROP COLUMN actor_count,
    DROP COLUMN group_key;

-- 마지막 행위자·행위자 수는 이 인덱스로 센다
CREATE INDEX ix_notification_actor_latest ON notification_actor (notification_id, created_at DESC);

------------------------------------------------------------
-- 5. 사진 → 리소스 (사진·첨부파일 통합 관리, 연결은 따로 다대다)
------------------------------------------------------------
ALTER TABLE image RENAME TO resource;
ALTER TABLE resource RENAME CONSTRAINT image_pkey TO resource_pkey;
ALTER TABLE resource RENAME CONSTRAINT fk_image_uploader TO fk_resource_uploader;
ALTER TABLE resource RENAME CONSTRAINT uq_image_storage_key TO uq_resource_storage_key;
ALTER INDEX ix_image_uploader RENAME TO ix_resource_uploader;
ALTER TABLE resource ADD COLUMN kind varchar(10) NOT NULL DEFAULT 'IMAGE';
ALTER TABLE resource ALTER COLUMN kind DROP DEFAULT;
-- 하위 테이블이 (id, kind)를 FK로 가리켜 사진 행이 파일 하위 테이블에 들어가지 못하게 한다
ALTER TABLE resource ADD CONSTRAINT uq_resource_id_kind UNIQUE (id, kind);

-- 사진 전용 속성
CREATE TABLE resource_image (
    resource_id            bigint NOT NULL,
    kind                   varchar(10) NOT NULL DEFAULT 'IMAGE',
    width                  integer NULL,
    height                 integer NULL,
    thumb_storage_key      varchar(255) NULL,
    thumb_size_bytes       integer NULL,
    PRIMARY KEY (resource_id),
    CONSTRAINT fk_resource_image_resource FOREIGN KEY (resource_id, kind) REFERENCES resource (id, kind) ON DELETE CASCADE,
    CONSTRAINT uq_resource_image_thumb_key UNIQUE (thumb_storage_key),
    CONSTRAINT ck_resource_image_kind CHECK (kind = 'IMAGE'),
    CONSTRAINT ck_resource_image_dim CHECK ((width IS NULL OR width > 0) AND (height IS NULL OR height > 0)),
    CONSTRAINT ck_resource_image_thumb_size CHECK (thumb_size_bytes IS NULL OR (thumb_size_bytes > 0 AND thumb_size_bytes <= 1048576))
);

-- 첨부파일 전용 속성 (내려받을 때 원래 이름이 필요)
CREATE TABLE resource_file (
    resource_id            bigint NOT NULL,
    kind                   varchar(10) NOT NULL DEFAULT 'FILE',
    original_name          varchar(255) NOT NULL,
    PRIMARY KEY (resource_id),
    CONSTRAINT fk_resource_file_resource FOREIGN KEY (resource_id, kind) REFERENCES resource (id, kind) ON DELETE CASCADE,
    CONSTRAINT ck_resource_file_kind CHECK (kind = 'FILE'),
    CONSTRAINT ck_resource_file_name CHECK (length(btrim(original_name)) > 0)
);

INSERT INTO resource_image (resource_id, width, height, thumb_storage_key, thumb_size_bytes)
SELECT id, width, height, thumb_storage_key, thumb_size_bytes FROM resource;

-- 프로필 사진: 회원당 지금 사진 하나
CREATE TABLE member_profile_image (
    member_id              bigint NOT NULL,
    resource_id            bigint NOT NULL,
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_id),
    CONSTRAINT fk_member_profile_image_member FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE,
    CONSTRAINT fk_member_profile_image_resource FOREIGN KEY (resource_id) REFERENCES resource_image (resource_id) ON DELETE CASCADE,
    CONSTRAINT uq_member_profile_image_resource UNIQUE (resource_id)
);

INSERT INTO member_profile_image (member_id, resource_id, created_at)
SELECT uploader_id, id, created_at FROM resource
WHERE purpose = 'PROFILE' AND status = 'ATTACHED' AND detached_at IS NULL;

-- 글-사진: 순서(position 0 = 대표 사진, 목록 썸네일)
CREATE TABLE post_image_v3 (
    post_id                bigint NOT NULL,
    resource_id            bigint NOT NULL,
    position               smallint NOT NULL,
    PRIMARY KEY (post_id, resource_id),
    CONSTRAINT fk_post_image_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_image_resource FOREIGN KEY (resource_id) REFERENCES resource_image (resource_id) ON DELETE CASCADE,
    CONSTRAINT uq_post_image_position UNIQUE (post_id, position),
    CONSTRAINT ck_post_image_position CHECK (position >= 0)
);
INSERT INTO post_image_v3 (post_id, resource_id, position)
SELECT post_id, image_id, (row_number() OVER (PARTITION BY post_id ORDER BY image_id) - 1)::smallint FROM post_image;
DROP TABLE post_image;
ALTER TABLE post_image_v3 RENAME TO post_image;
ALTER TABLE post_image RENAME CONSTRAINT post_image_v3_pkey TO post_image_pkey;
CREATE INDEX ix_post_image_resource ON post_image (resource_id);

-- 글-첨부파일
CREATE TABLE post_file (
    post_id                bigint NOT NULL,
    resource_id            bigint NOT NULL,
    position               smallint NOT NULL,
    PRIMARY KEY (post_id, resource_id),
    CONSTRAINT fk_post_file_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_file_resource FOREIGN KEY (resource_id) REFERENCES resource_file (resource_id) ON DELETE CASCADE,
    CONSTRAINT uq_post_file_position UNIQUE (post_id, position),
    CONSTRAINT ck_post_file_position CHECK (position >= 0)
);
CREATE INDEX ix_post_file_resource ON post_file (resource_id);

-- 사진 상태(TEMP/ATTACHED)·용도(POST/PROFILE)는 연결 테이블에 행이 있는지로 알 수 있어 제거
DROP INDEX uq_image_profile_current;
DROP INDEX ix_image_cleanup_temp;
DROP INDEX ix_image_cleanup_detached;
ALTER TABLE resource
    DROP CONSTRAINT ck_image_status,
    DROP CONSTRAINT ck_image_purpose,
    DROP CONSTRAINT ck_image_dim,
    DROP CONSTRAINT ck_image_thumb_size,
    DROP CONSTRAINT uq_image_thumb_key,
    DROP CONSTRAINT ck_image_type,
    DROP CONSTRAINT ck_image_size,
    DROP COLUMN status,
    DROP COLUMN purpose,
    DROP COLUMN width,
    DROP COLUMN height,
    DROP COLUMN thumb_storage_key,
    DROP COLUMN thumb_size_bytes;

ALTER TABLE resource
    ADD CONSTRAINT ck_resource_kind CHECK (kind IN ('IMAGE', 'FILE')),
    ADD CONSTRAINT ck_resource_type CHECK (
        (kind = 'IMAGE' AND content_type IN ('image/jpeg', 'image/png', 'image/gif', 'image/webp'))
        OR (kind = 'FILE' AND content_type IN ('application/pdf', 'application/zip', 'text/plain', 'text/markdown', 'text/csv',
                                               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                               'application/vnd.openxmlformats-officedocument.presentationml.presentation'))),
    ADD CONSTRAINT ck_resource_size CHECK (
        size_bytes > 0 AND size_bytes <= CASE kind WHEN 'IMAGE' THEN 10485760 ELSE 20971520 END);

-- 정리 배치: 연결이 없는 리소스를 created_at·detached_at 기준으로 찾는다
CREATE INDEX ix_resource_cleanup ON resource (created_at);
CREATE INDEX ix_resource_detached ON resource (detached_at) WHERE detached_at IS NOT NULL;

COMMENT ON TABLE resource IS '리소스 (사진·첨부파일 공통)';
COMMENT ON COLUMN resource.id IS '리소스 번호';
COMMENT ON COLUMN resource.uploader_id IS '올린 회원 번호';
COMMENT ON COLUMN resource.kind IS '리소스 종류';
COMMENT ON COLUMN resource.storage_key IS '저장 경로';
COMMENT ON COLUMN resource.content_type IS '파일 형식';
COMMENT ON COLUMN resource.size_bytes IS '파일 크기';
COMMENT ON COLUMN resource.detached_at IS '연결 해제 일자';
COMMENT ON COLUMN resource.created_at IS '생성 일자';
COMMENT ON TABLE resource_image IS '사진 리소스';
COMMENT ON COLUMN resource_image.resource_id IS '리소스 번호';
COMMENT ON COLUMN resource_image.kind IS '리소스 종류';
COMMENT ON COLUMN resource_image.width IS '가로';
COMMENT ON COLUMN resource_image.height IS '세로';
COMMENT ON COLUMN resource_image.thumb_storage_key IS '썸네일 경로';
COMMENT ON COLUMN resource_image.thumb_size_bytes IS '썸네일 크기';
COMMENT ON TABLE resource_file IS '첨부파일 리소스';
COMMENT ON COLUMN resource_file.resource_id IS '리소스 번호';
COMMENT ON COLUMN resource_file.kind IS '리소스 종류';
COMMENT ON COLUMN resource_file.original_name IS '원래 파일 이름';
COMMENT ON TABLE member_profile_image IS '프로필 사진';
COMMENT ON COLUMN member_profile_image.member_id IS '회원 번호';
COMMENT ON COLUMN member_profile_image.resource_id IS '리소스 번호';
COMMENT ON COLUMN member_profile_image.created_at IS '설정 일자';
COMMENT ON TABLE post_image IS '글-사진 연결';
COMMENT ON COLUMN post_image.post_id IS '글 번호';
COMMENT ON COLUMN post_image.resource_id IS '리소스 번호';
COMMENT ON COLUMN post_image.position IS '본문 속 순서 (0 = 대표 사진)';
COMMENT ON TABLE post_file IS '글-첨부파일 연결';
COMMENT ON COLUMN post_file.post_id IS '글 번호';
COMMENT ON COLUMN post_file.resource_id IS '리소스 번호';
COMMENT ON COLUMN post_file.position IS '첨부 순서';
