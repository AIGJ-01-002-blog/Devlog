-- ERD Cloud "ai blog" (erdcloud.com/d/iHEdnoc3zbWTMoMuo) 내보내기 원본. 2026-10-07 회의 반영 뒤, MySQL 표기.
-- 옵션: ADD PK CONSTRAINT · ADD FK CONSTRAINT · ADD NON IDENTIFYING RELATIONSHIP CONSTRAINT 켬. 손대지 않은 원본이다.
-- 20개 테이블 / 148개 컬럼 / PK 20 / FK 40. COMMENT는 ERD Cloud 설명 칸이다(한글 논리명은 내보내기에 없음).
-- PostgreSQL 실행용이 아니다. 실행 DDL은 V1__common_schema.sql이며 둘의 대조 결과는 docs/51-erd-unified.md §4 검증 결과에 있다.

CREATE TABLE `notification` (
	`id`	BIGINT	NOT NULL	COMMENT 'PK, 자동 증가',
	`receiver_id`	BIGINT	NOT NULL	COMMENT 'FK → member',
	`type`	VARCHAR(30)	NOT NULL	COMMENT 'COMMENT, REPLY, LIKE, FOLLOW, NEW_POST, REPORT_RESOLVED, CONTENT_HIDDEN',
	`post_id`	BIGINT	NULL	COMMENT 'FK → post, 글이 지워지면 함께 삭제',
	`comment_id`	BIGINT	NULL	COMMENT 'FK → comment, 댓글이 지워지면 함께 삭제',
	`report_id`	BIGINT	NULL	COMMENT 'FK → report, 신고가 지워지면 비움',
	`result`	VARCHAR(20)	NULL	COMMENT 'ACTION_TAKEN / NO_VIOLATION, REPORT_RESOLVED만',
	`last_actor_id`	BIGINT	NULL	COMMENT 'FK → member. 운영 알림은 비움 (의도된 중복)',
	`actor_count`	INT	NOT NULL	DEFAULT 0	COMMENT '외 N명 계산용 (의도된 중복)',
	`group_key`	VARCHAR(100)	NULL	COMMENT 'LIKE:post:글번호 또는 FOLLOW, LIKE·FOLLOW만',
	`read_at`	DATETIME	NULL	COMMENT '비어 있으면 안 읽음',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '알림 행이 처음 생긴 일자(기록용). 화면 시각·정렬·90일 정리는 updated_at 기준 (25 §2·§5·§6)',
	`updated_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '묶음에 사람이 더해지면 갱신 → 목록 맨 위로'
);

CREATE TABLE `post_tag` (
	`post_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → post, 글이 지워지면 함께 삭제',
	`tag_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → tag',
	`position`	SMALLINT	NOT NULL	COMMENT '0부터, 한 글 안에서 중복 없음 (0~99)'
);

CREATE TABLE `report_case` (
	`id`	BIGINT	NOT NULL	COMMENT 'PK, 자동 증가',
	`target_type`	VARCHAR(20)	NOT NULL	COMMENT 'POST / COMMENT. 아래 두 FK 중 해당하는 것만 채움',
	`post_id`	BIGINT	NULL	COMMENT 'FK → post. 글이 완전히 지워지면 비움 (스냅샷은 남음)',
	`comment_id`	BIGINT	NULL	COMMENT 'FK → comment. 댓글이 지워지면 비움',
	`target_author_id`	BIGINT	NOT NULL	COMMENT 'FK → member. 자기 것 신고 금지 판단, 탈퇴 정리용',
	`snapshot_title`	VARCHAR(100)	NULL	COMMENT '첫 신고 때 복사. 댓글이면 비움',
	`snapshot_content`	VARCHAR(2000)	NULL	COMMENT '첫 신고 때 복사 (글 앞 2,000자, 댓글 전체). 관리자는 이것만 봄 (43 H-5)',
	`status`	VARCHAR(20)	NOT NULL	DEFAULT 'PENDING'	COMMENT 'PENDING / HIDDEN / REJECTED / CLOSED_NO_TARGET',
	`handled_by`	BIGINT	NULL	COMMENT 'FK → member',
	`handled_at`	DATETIME	NULL,
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '첫 신고가 들어온 일자'
);

CREATE TABLE `post_draft` (
	`post_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → post, 글이 지워지면 함께 삭제',
	`title`	VARCHAR(100)	NOT NULL	DEFAULT '',
	`content_md`	TEXT	NOT NULL	DEFAULT ''	COMMENT '최대 100,000자',
	`edit_version`	BIGINT	NOT NULL	DEFAULT 0	COMMENT '늦게 온 옛 저장이 덮어쓰지 않게',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '수정을 시작한 일자',
	`updated_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '마지막 저장 일자'
);

CREATE TABLE `post` (
	`id`	BIGINT	NOT NULL	COMMENT 'PK, 자동 증가',
	`author_id`	BIGINT	NOT NULL	COMMENT 'FK → member',
	`title`	VARCHAR(100)	NOT NULL	DEFAULT ''	COMMENT '최대 100자, 발행하려면 필수 (05)',
	`content_md`	TEXT	NOT NULL	DEFAULT ''	COMMENT 'Markdown 원문, 최대 100,000자 (12)',
	`content_html`	TEXT	NOT NULL	DEFAULT ''	COMMENT '정화된 HTML, 화면에 그대로 출력 (12)',
	`excerpt`	VARCHAR(200)	NULL	COMMENT '목록 카드 요약 (10)',
	`thumbnail_url`	VARCHAR(500)	NULL	COMMENT '목록 카드 썸네일 (10)',
	`status`	VARCHAR(20)	NOT NULL	DEFAULT 'DRAFT'	COMMENT 'DRAFT(임시) / PUBLISHED(발행)',
	`visibility`	VARCHAR(20)	NOT NULL	DEFAULT 'PUBLIC'	COMMENT 'PUBLIC / PRIVATE (친구 공개 구현 시 FRIENDS)',
	`view_count`	BIGINT	NOT NULL	DEFAULT 0	COMMENT '의도된 중복 (31)',
	`like_count`	INT	NOT NULL	DEFAULT 0	COMMENT '의도된 중복, post_like 행과 같은 트랜잭션에서 증감 (30)',
	`comment_count`	INT	NOT NULL	DEFAULT 0	COMMENT '보이는 댓글 수 = 삭제·숨김 제외 (21)',
	`edit_version`	BIGINT	NOT NULL	DEFAULT 0	COMMENT '자동 저장 충돌 방지 (04)',
	`render_version`	INT	NOT NULL	DEFAULT 1	COMMENT '렌더링 규칙이 바뀌면 다시 렌더링 (12)',
	`published_at`	DATETIME	NULL	COMMENT '(05)',
	`first_public_at`	DATETIME	NULL	COMMENT '목록 정렬 기준, 한 번 정해지면 안 바뀜 (05·06·10)',
	`edited_at`	DATETIME	NULL	COMMENT '다시 발행한 일자, 수정됨 표시 (05)',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP,
	`updated_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP,
	`deleted_at`	DATETIME	NULL	COMMENT '휴지통으로 옮긴 일자, 30일 뒤 완전 삭제 (13)',
	`hidden_at`	DATETIME	NULL	COMMENT '관리자 숨김. 목록 조건 hidden_at IS NULL (43)',
	`hidden_by`	BIGINT	NULL	COMMENT 'FK → member (43)',
	`hidden_reason`	VARCHAR(30)	NULL	COMMENT '(43)'
);

CREATE TABLE `follow` (
	`follower_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → member',
	`followee_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → member. 자기 자신은 불가',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '팔로우한 일자'
);

CREATE TABLE `member` (
	`id`	BIGINT	NOT NULL	COMMENT 'PK, 자동 증가',
	`handle`	VARCHAR(39)	NOT NULL	COMMENT '/@handle. 소문자·숫자·_ 3~36자, 소셜 가입은 go-·gi- 접두어. 가입 후 변경 불가, 탈퇴 후에도 재사용 불가 (08). 유일',
	`nickname`	VARCHAR(10)	NULL	COMMENT '2~10자 한글·영문·숫자, 대소문자 무시 유일. 익명 처리 후에만 비움 (09)',
	`nickname_changed_at`	DATETIME	NULL	COMMENT '30일 변경 제한 판단 (09)',
	`bio`	VARCHAR(200)	NULL	COMMENT '0~200자, 글자만 (11)',
	`role`	VARCHAR(20)	NOT NULL	DEFAULT 'USER'	COMMENT 'USER / ADMIN',
	`status`	VARCHAR(20)	NOT NULL	DEFAULT 'ACTIVE'	COMMENT 'ACTIVE / SUSPENDED(정지 중, 근거는 member_suspension) / WITHDRAWN(탈퇴 유예)',
	`default_visibility`	VARCHAR(20)	NOT NULL	DEFAULT 'PUBLIC'	COMMENT '새 글의 공개 범위 PUBLIC / PRIVATE (06)',
	`withdrawn_at`	DATETIME	NULL	COMMENT '30일 유예 시작. status = WITHDRAWN일 때만 (13)',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '가입한 일자',
	`updated_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '회원 정보를 마지막으로 바꾼 일자',
	`deleted_at`	DATETIME	NULL	COMMENT '탈퇴 30일 뒤 개인 정보를 지운 일자. handle만 남김 (13)',
	`last_active_at`	DATETIME	NULL	COMMENT '친구에게 보여 줄 최근 활동. 한 시간에 한 번 정도만 갱신.익명 처리 때 비움',
	`last_active_visible`	BOOLEAN	NOT NULL	DEFAULT TRUE	COMMENT '친구(ACCEPTED)에게 최근 활동을 보일지. 숨기면 나도 남의 것을 못 봄'
);

CREATE TABLE `friendship` (
	`member_a_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → member. 두 번호 중 작은 쪽',
	`member_b_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → member. 두 번호 중 큰 쪽',
	`requested_by`	BIGINT	NOT NULL	COMMENT 'FK → member (개선: 외래키 추가). A 또는 B 중 하나',
	`status`	VARCHAR(20)	NOT NULL	DEFAULT 'PENDING'	COMMENT 'PENDING(요청 중) / ACCEPTED(친구)',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '요청한 일자',
	`accepted_at`	DATETIME	NULL	COMMENT 'ACCEPTED일 때만'
);

CREATE TABLE `post_like` (
	`post_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → post, 글이 지워지면 함께 삭제',
	`member_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → member, 누른 사람',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '누른 일자'
);

CREATE TABLE `notification_actor` (
	`notification_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → notification, 알림이 지워지면 함께 삭제',
	`actor_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → member, 같은 사람은 한 번만',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '묶음에 들어간 일자'
);

CREATE TABLE `report` (
	`id`	BIGINT	NOT NULL	COMMENT 'PK, 자동 증가. 알림(notification.report_id)이 가리킴',
	`case_id`	BIGINT	NOT NULL	COMMENT 'FK → report_case',
	`reporter_id`	BIGINT	NOT NULL	COMMENT 'FK → member. 자기 것은 신고 불가',
	`reason`	VARCHAR(30)	NOT NULL	COMMENT 'SPAM / ABUSE / SEXUAL / PRIVACY / COPYRIGHT / OTHER',
	`detail`	VARCHAR(200)	NULL	COMMENT 'OTHER면 필수, 200자',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '신고한 일자'
);

CREATE TABLE `auth_identity` (
	`id`	BIGINT	NOT NULL	COMMENT 'PK, 자동 증가',
	`member_id`	BIGINT	NOT NULL	COMMENT 'FK → member. 계정당 1개 (유일)',
	`provider`	VARCHAR(20)	NOT NULL	COMMENT 'LOCAL(이메일) / GITHUB / GOOGLE',
	`provider_user_id`	VARCHAR(255)	NOT NULL	COMMENT '제공자의 사용자 ID, 이메일 가입은 소문자 이메일. (provider, provider_user_id) 유일',
	`email`	VARCHAR(255)	NULL	COMMENT '이메일 가입은 필수(소문자), 소셜은 받은 경우만',
	`password_hash`	VARCHAR(100)	NULL	COMMENT '이메일 가입만',
	`email_verified_at`	DATETIME	NULL	COMMENT '비어 있으면 인증 전 → 글·댓글·사진·좋아요·신고 불가 (42 P-6)',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '로그인 수단을 등록한 일자',
	`last_login_at`	DATETIME	NULL
);

CREATE TABLE `post_image` (
	`post_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → post, 글이 지워지면 함께 삭제',
	`image_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → image, 사진이 지워지면 함께 삭제'
);

CREATE TABLE `comment` (
	`id`	BIGINT	NOT NULL	COMMENT 'PK, 자동 증가',
	`post_id`	BIGINT	NOT NULL	COMMENT 'FK → post, 글이 지워지면 함께 삭제',
	`author_id`	BIGINT	NOT NULL	COMMENT 'FK → member',
	`parent_id`	BIGINT	NULL	COMMENT '답글이면 최상위 댓글 번호, 같은 글의 댓글만 (실제 FK는 post_id와 함께 거는 복합 FK)',
	`reply_to_member_id`	BIGINT	NULL	COMMENT 'FK → member, @대상에게 표시',
	`content`	VARCHAR(1000)	NOT NULL	COMMENT '1~1000자, 글자만. 삭제된 자리는 빈 내용',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '쓴 일자',
	`updated_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '내용을 고칠 때만 바뀜 → 수정됨 표시',
	`deleted_at`	DATETIME	NULL	COMMENT '답글이 있어 자리만 남긴 삭제 또는 탈퇴 익명 처리',
	`hidden_at`	DATETIME	NULL	COMMENT '관리자 숨김 (43)',
	`hidden_by`	BIGINT	NULL	COMMENT 'FK → member (43)',
	`hidden_reason`	VARCHAR(30)	NULL	COMMENT '(43)'
);

CREATE TABLE `member_suspension` (
	`id`	BIGINT	NOT NULL	COMMENT 'PK, 자동 증가',
	`member_id`	BIGINT	NOT NULL	COMMENT 'FK → member',
	`reason`	VARCHAR(200)	NOT NULL	COMMENT '로그인 화면에 그대로 안내 (43 §6)',
	`started_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '이 순간 모든 세션 삭제 (42 P-7)',
	`ends_at`	DATETIME	NULL	COMMENT '1·7·30일 중 선택, 영구 정지는 비움',
	`suspended_by`	BIGINT	NOT NULL	COMMENT 'FK → member. 관리자는 관리자를 정지할 수 없음',
	`lifted_at`	DATETIME	NULL	COMMENT '기간 만료 후 로그인 시 자동 해제 포함',
	`lifted_by`	BIGINT	NULL	COMMENT 'FK → member. 자동 해제면 비움'
);

CREATE TABLE `tag` (
	`id`	BIGINT	NOT NULL	COMMENT 'PK, 자동 증가',
	`name`	VARCHAR(30)	NOT NULL	COMMENT '유일. 한글·영문 소문자·숫자·- _ . + # 만, 1~30자, 띄어쓰기는 하이픈',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '처음 쓰인 일자'
);

CREATE TABLE `post_view_daily` (
	`view_date`	DATE	NOT NULL	COMMENT 'PK. 한국 시간 기준 날짜 (DATE 타입)',
	`post_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → post, 글이 지워지면 함께 삭제',
	`views`	INT	NOT NULL	COMMENT '그날 합계, 1 이상'
);

CREATE TABLE `notification_mute` (
	`type`	VARCHAR(30)	NOT NULL	COMMENT 'PK. COMMENT, REPLY, LIKE, FOLLOW, NEW_POST 만 (운영 알림은 끌 수 없음). 실제 PK 순서 (member_id, type) = V1 기준',
	`member_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → member',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '끈 일자'
);

CREATE TABLE `member_agreement` (
	`type`	VARCHAR(20)	NOT NULL	COMMENT 'PK. TERMS(이용약관) / PRIVACY(개인정보 처리방침) / AI(글 내용 외부 AI 전송, 34)',
	`member_id`	BIGINT	NOT NULL	COMMENT 'PK + FK → member',
	`agreed_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '동의한 일자. AI 동의를 철회하면 행 삭제',
	`version`	VARCHAR(20)	NOT NULL	COMMENT '동의한 버전 약관'
);

CREATE TABLE `image` (
	`id`	BIGINT	NOT NULL	COMMENT 'PK, 자동 증가',
	`uploader_id`	BIGINT	NOT NULL	COMMENT 'FK → member',
	`storage_key`	VARCHAR(255)	NOT NULL	COMMENT 'images/년/월/uuid.확장자, 서버가 만듦, 유일',
	`thumb_storage_key`	VARCHAR(255)	NULL	COMMENT '640px 썸네일, 유일',
	`content_type`	VARCHAR(50)	NOT NULL	COMMENT 'image/jpeg, png, gif, webp 만',
	`size_bytes`	INT	NOT NULL	COMMENT '1바이트~10MB',
	`thumb_size_bytes`	INT	NULL	COMMENT '1바이트~1MB, 1인 1GB 한도에 함께 셈',
	`width`	INT	NULL	COMMENT '픽셀',
	`height`	INT	NULL	COMMENT '픽셀',
	`status`	VARCHAR(20)	NOT NULL	DEFAULT 'TEMP'	COMMENT 'TEMP(올리기만 함) → ATTACHED(연결됨)',
	`purpose`	VARCHAR(20)	NOT NULL	DEFAULT 'POST'	COMMENT 'POST(글 사진) / PROFILE(프로필 사진)',
	`detached_at`	DATETIME	NULL	COMMENT '글·프로필에서 빠진 일자, 7일 뒤 정리',
	`created_at`	DATETIME	NOT NULL	DEFAULT CURRENT_TIMESTAMP	COMMENT '올린 일자'
);

ALTER TABLE `notification` ADD CONSTRAINT `PK_NOTIFICATION` PRIMARY KEY (
	`id`
);

ALTER TABLE `post_tag` ADD CONSTRAINT `PK_POST_TAG` PRIMARY KEY (
	`post_id`,
	`tag_id`
);

ALTER TABLE `report_case` ADD CONSTRAINT `PK_REPORT_CASE` PRIMARY KEY (
	`id`
);

ALTER TABLE `post_draft` ADD CONSTRAINT `PK_POST_DRAFT` PRIMARY KEY (
	`post_id`
);

ALTER TABLE `post` ADD CONSTRAINT `PK_POST` PRIMARY KEY (
	`id`
);

ALTER TABLE `follow` ADD CONSTRAINT `PK_FOLLOW` PRIMARY KEY (
	`follower_id`,
	`followee_id`
);

ALTER TABLE `member` ADD CONSTRAINT `PK_MEMBER` PRIMARY KEY (
	`id`
);

ALTER TABLE `friendship` ADD CONSTRAINT `PK_FRIENDSHIP` PRIMARY KEY (
	`member_a_id`,
	`member_b_id`
);

ALTER TABLE `post_like` ADD CONSTRAINT `PK_POST_LIKE` PRIMARY KEY (
	`post_id`,
	`member_id`
);

ALTER TABLE `notification_actor` ADD CONSTRAINT `PK_NOTIFICATION_ACTOR` PRIMARY KEY (
	`notification_id`,
	`actor_id`
);

ALTER TABLE `report` ADD CONSTRAINT `PK_REPORT` PRIMARY KEY (
	`id`
);

ALTER TABLE `auth_identity` ADD CONSTRAINT `PK_AUTH_IDENTITY` PRIMARY KEY (
	`id`
);

ALTER TABLE `post_image` ADD CONSTRAINT `PK_POST_IMAGE` PRIMARY KEY (
	`post_id`,
	`image_id`
);

ALTER TABLE `comment` ADD CONSTRAINT `PK_COMMENT` PRIMARY KEY (
	`id`
);

ALTER TABLE `member_suspension` ADD CONSTRAINT `PK_MEMBER_SUSPENSION` PRIMARY KEY (
	`id`
);

ALTER TABLE `tag` ADD CONSTRAINT `PK_TAG` PRIMARY KEY (
	`id`
);

ALTER TABLE `post_view_daily` ADD CONSTRAINT `PK_POST_VIEW_DAILY` PRIMARY KEY (
	`view_date`,
	`post_id`
);

ALTER TABLE `notification_mute` ADD CONSTRAINT `PK_NOTIFICATION_MUTE` PRIMARY KEY (
	`type`,
	`member_id`
);

ALTER TABLE `member_agreement` ADD CONSTRAINT `PK_MEMBER_AGREEMENT` PRIMARY KEY (
	`type`,
	`member_id`
);

ALTER TABLE `image` ADD CONSTRAINT `PK_IMAGE` PRIMARY KEY (
	`id`
);

ALTER TABLE `notification` ADD CONSTRAINT `FK_member_TO_notification_1` FOREIGN KEY (
	`receiver_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `notification` ADD CONSTRAINT `FK_member_TO_notification_2` FOREIGN KEY (
	`last_actor_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `notification` ADD CONSTRAINT `FK_post_TO_notification_1` FOREIGN KEY (
	`post_id`
)
REFERENCES `post` (
	`id`
);

ALTER TABLE `notification` ADD CONSTRAINT `FK_comment_TO_notification_1` FOREIGN KEY (
	`comment_id`
)
REFERENCES `comment` (
	`id`
);

ALTER TABLE `notification` ADD CONSTRAINT `FK_report_TO_notification_1` FOREIGN KEY (
	`report_id`
)
REFERENCES `report` (
	`id`
);

ALTER TABLE `post_tag` ADD CONSTRAINT `FK_post_TO_post_tag_1` FOREIGN KEY (
	`post_id`
)
REFERENCES `post` (
	`id`
);

ALTER TABLE `post_tag` ADD CONSTRAINT `FK_tag_TO_post_tag_1` FOREIGN KEY (
	`tag_id`
)
REFERENCES `tag` (
	`id`
);

ALTER TABLE `report_case` ADD CONSTRAINT `FK_post_TO_report_case_1` FOREIGN KEY (
	`post_id`
)
REFERENCES `post` (
	`id`
);

ALTER TABLE `report_case` ADD CONSTRAINT `FK_comment_TO_report_case_1` FOREIGN KEY (
	`comment_id`
)
REFERENCES `comment` (
	`id`
);

ALTER TABLE `report_case` ADD CONSTRAINT `FK_member_TO_report_case_1` FOREIGN KEY (
	`target_author_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `report_case` ADD CONSTRAINT `FK_member_TO_report_case_2` FOREIGN KEY (
	`handled_by`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `post_draft` ADD CONSTRAINT `FK_post_TO_post_draft_1` FOREIGN KEY (
	`post_id`
)
REFERENCES `post` (
	`id`
);

ALTER TABLE `post` ADD CONSTRAINT `FK_member_TO_post_1` FOREIGN KEY (
	`author_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `post` ADD CONSTRAINT `FK_member_TO_post_2` FOREIGN KEY (
	`hidden_by`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `follow` ADD CONSTRAINT `FK_member_TO_follow_1` FOREIGN KEY (
	`follower_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `follow` ADD CONSTRAINT `FK_member_TO_follow_2` FOREIGN KEY (
	`followee_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `friendship` ADD CONSTRAINT `FK_member_TO_friendship_1` FOREIGN KEY (
	`member_a_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `friendship` ADD CONSTRAINT `FK_member_TO_friendship_2` FOREIGN KEY (
	`member_b_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `friendship` ADD CONSTRAINT `FK_member_TO_friendship_3` FOREIGN KEY (
	`requested_by`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `post_like` ADD CONSTRAINT `FK_post_TO_post_like_1` FOREIGN KEY (
	`post_id`
)
REFERENCES `post` (
	`id`
);

ALTER TABLE `post_like` ADD CONSTRAINT `FK_member_TO_post_like_1` FOREIGN KEY (
	`member_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `notification_actor` ADD CONSTRAINT `FK_notification_TO_notification_actor_1` FOREIGN KEY (
	`notification_id`
)
REFERENCES `notification` (
	`id`
);

ALTER TABLE `notification_actor` ADD CONSTRAINT `FK_member_TO_notification_actor_1` FOREIGN KEY (
	`actor_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `report` ADD CONSTRAINT `FK_report_case_TO_report_1` FOREIGN KEY (
	`case_id`
)
REFERENCES `report_case` (
	`id`
);

ALTER TABLE `report` ADD CONSTRAINT `FK_member_TO_report_1` FOREIGN KEY (
	`reporter_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `auth_identity` ADD CONSTRAINT `FK_member_TO_auth_identity_1` FOREIGN KEY (
	`member_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `post_image` ADD CONSTRAINT `FK_post_TO_post_image_1` FOREIGN KEY (
	`post_id`
)
REFERENCES `post` (
	`id`
);

ALTER TABLE `post_image` ADD CONSTRAINT `FK_image_TO_post_image_1` FOREIGN KEY (
	`image_id`
)
REFERENCES `image` (
	`id`
);

ALTER TABLE `comment` ADD CONSTRAINT `FK_post_TO_comment_1` FOREIGN KEY (
	`post_id`
)
REFERENCES `post` (
	`id`
);

ALTER TABLE `comment` ADD CONSTRAINT `FK_member_TO_comment_1` FOREIGN KEY (
	`author_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `comment` ADD CONSTRAINT `FK_member_TO_comment_2` FOREIGN KEY (
	`reply_to_member_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `comment` ADD CONSTRAINT `FK_member_TO_comment_3` FOREIGN KEY (
	`hidden_by`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `comment` ADD CONSTRAINT `FK_comment_TO_comment_1` FOREIGN KEY (
	`parent_id`
)
REFERENCES `comment` (
	`id`
);

ALTER TABLE `member_suspension` ADD CONSTRAINT `FK_member_TO_member_suspension_1` FOREIGN KEY (
	`member_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `member_suspension` ADD CONSTRAINT `FK_member_TO_member_suspension_2` FOREIGN KEY (
	`suspended_by`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `member_suspension` ADD CONSTRAINT `FK_member_TO_member_suspension_3` FOREIGN KEY (
	`lifted_by`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `post_view_daily` ADD CONSTRAINT `FK_post_TO_post_view_daily_1` FOREIGN KEY (
	`post_id`
)
REFERENCES `post` (
	`id`
);

ALTER TABLE `notification_mute` ADD CONSTRAINT `FK_member_TO_notification_mute_1` FOREIGN KEY (
	`member_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `member_agreement` ADD CONSTRAINT `FK_member_TO_member_agreement_1` FOREIGN KEY (
	`member_id`
)
REFERENCES `member` (
	`id`
);

ALTER TABLE `image` ADD CONSTRAINT `FK_member_TO_image_1` FOREIGN KEY (
	`uploader_id`
)
REFERENCES `member` (
	`id`
);

