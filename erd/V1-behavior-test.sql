-- 통합 V1 동작 검증. 빈 DB에 V1을 적용한 뒤 실행한다. 모든 변경은 ROLLBACK된다.
-- 실행: psql -X -v ON_ERROR_STOP=1 -f erd/V1-behavior-test.sql   (기대 결과: pass 38 / fail 0)
\set ON_ERROR_STOP 1
BEGIN;
CREATE TEMP TABLE r(n serial, name text, ok bool, got text);
CREATE FUNCTION pg_temp.expect(name text, q text, code text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE q;
    INSERT INTO r(name,ok,got) VALUES (name, code IS NULL, 'ok');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO r(name,ok,got) VALUES (name, SQLSTATE = code, SQLSTATE||' '||SQLERRM);
  END;
END $$;
-- 기본 데이터
INSERT INTO member (handle,nickname) VALUES ('alice','앨리스'),('bob','밥이'),('admin','관리자');
INSERT INTO post (author_id,title) VALUES (2,'신고될 글');
INSERT INTO comment (post_id,author_id,content) VALUES (1,2,'신고될 댓글');
SELECT pg_temp.expect('회원은 동의 컬럼 없이 생성', $q$INSERT INTO member (handle,nickname) VALUES ('carol','캐럴')$q$, NULL);
SELECT pg_temp.expect('최근 활동: 새 회원은 비어 있고 공개 기본값', $q$DO $d$ BEGIN IF NOT EXISTS (SELECT 1 FROM member WHERE handle='carol' AND last_active_at IS NULL AND last_active_visible) THEN RAISE EXCEPTION 'bad'; END IF; END $d$$q$, NULL);
SELECT pg_temp.expect('최근 활동 갱신과 숨기기', $q$UPDATE member SET last_active_at=now(), last_active_visible=false WHERE handle='carol'$q$, NULL);
SELECT pg_temp.expect('동의 정상 저장', $q$INSERT INTO member_agreement (member_id,type,version) VALUES (1,'TERMS','2026-10-07'),(1,'PRIVACY','2026-10-07'),(1,'AI','2026-10-07')$q$, NULL);
SELECT pg_temp.expect('동의 종류 허용값 밖 거부', $q$INSERT INTO member_agreement (member_id,type,version) VALUES (1,'MARKETING','2026-10-07')$q$, '23514');
SELECT pg_temp.expect('같은 동의 중복 거부', $q$INSERT INTO member_agreement (member_id,type,version) VALUES (1,'TERMS','2026-10-07')$q$, '23505');
SELECT pg_temp.expect('동의 버전 없이 저장 거부', $q$INSERT INTO member_agreement (member_id,type) VALUES (2,'TERMS')$q$, '23502');
SELECT pg_temp.expect('약관 개정 뒤 재동의는 버전·일자 갱신', $q$UPDATE member_agreement SET version='2026-12-01', agreed_at=now() WHERE member_id=1 AND type='TERMS'$q$, NULL);
SELECT pg_temp.expect('친구 요청자 FK 존재', $q$DO $d$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_friendship_requested_by' AND confrelid='member'::regclass) THEN RAISE EXCEPTION 'missing'; END IF; END $d$$q$, NULL);
SELECT pg_temp.expect('친구 요청자 CHECK: 제3자 거부', $q$INSERT INTO friendship (member_a_id,member_b_id,requested_by) VALUES (1,2,3)$q$, '23514');
SELECT pg_temp.expect('글 신고 사건 생성', $q$INSERT INTO report_case (target_type,post_id,target_author_id,snapshot_title,snapshot_content) VALUES ('POST',1,2,'신고될 글','본문')$q$, NULL);
SELECT pg_temp.expect('댓글 신고 사건 생성', $q$INSERT INTO report_case (target_type,comment_id,target_author_id,snapshot_content) VALUES ('COMMENT',1,2,'신고될 댓글')$q$, NULL);
SELECT pg_temp.expect('글 사건에 댓글 FK 거부', $q$INSERT INTO report_case (target_type,post_id,comment_id,target_author_id) VALUES ('POST',1,1,2)$q$, '23514');
SELECT pg_temp.expect('사건 상태 허용값 밖 거부', $q$INSERT INTO report_case (target_type,post_id,target_author_id,status) VALUES ('POST',1,2,'DONE')$q$, '23514');
SELECT pg_temp.expect('신고 저장', $q$INSERT INTO report (case_id,reporter_id,reason) VALUES (1,1,'SPAM'),(1,3,'ABUSE')$q$, NULL);
SELECT pg_temp.expect('같은 사건 같은 신고자 중복 거부', $q$INSERT INTO report (case_id,reporter_id,reason) VALUES (1,1,'ABUSE')$q$, '23505');
SELECT pg_temp.expect('기타 사유 공백 설명 거부', $q$INSERT INTO report (case_id,reporter_id,reason,detail) VALUES (2,1,'OTHER','  ')$q$, '23514');
SELECT pg_temp.expect('신고가 있는 사건 삭제 RESTRICT', $q$DELETE FROM report_case WHERE id=1$q$, '23001');
SELECT pg_temp.expect('신고 알림 저장', $q$INSERT INTO notification (receiver_id,type,report_id,result) VALUES (1,'REPORT_RESOLVED',1,'ACTION_TAKEN')$q$, NULL);
SELECT pg_temp.expect('신고 삭제 시 알림 report_id SET NULL', $q$DELETE FROM report WHERE id=1$q$, NULL);
SELECT pg_temp.expect('알림 report_id가 NULL', $q$DO $d$ BEGIN IF (SELECT report_id FROM notification WHERE id=1) IS NOT NULL THEN RAISE EXCEPTION 'not null'; END IF; END $d$$q$, NULL);
SELECT pg_temp.expect('글 완전 삭제', $q$DELETE FROM post WHERE id=1$q$, NULL);
SELECT pg_temp.expect('글 삭제 뒤 사건 post_id NULL·스냅샷 유지', $q$DO $d$ BEGIN IF NOT EXISTS (SELECT 1 FROM report_case WHERE id=1 AND post_id IS NULL AND snapshot_content='본문') THEN RAISE EXCEPTION 'bad'; END IF; END $d$$q$, NULL);
SELECT pg_temp.expect('글 CASCADE로 댓글 삭제 뒤 사건 comment_id NULL', $q$DO $d$ BEGIN IF NOT EXISTS (SELECT 1 FROM report_case WHERE id=2 AND comment_id IS NULL) THEN RAISE EXCEPTION 'bad'; END IF; END $d$$q$, NULL);
SELECT pg_temp.expect('대상 사라진 사건 종료 처리', $q$UPDATE report_case SET status='CLOSED_NO_TARGET', handled_at=now() WHERE id=1$q$, NULL);
SELECT pg_temp.expect('정지 저장', $q$INSERT INTO member_suspension (member_id,reason,ends_at,suspended_by) VALUES (2,'스팸',now()+interval '7 days',3)$q$, NULL);
SELECT pg_temp.expect('정지 종료가 시작보다 앞이면 거부', $q$INSERT INTO member_suspension (member_id,reason,started_at,ends_at,suspended_by) VALUES (2,'x',now(),now()-interval '1 day',3)$q$, '23514');
SELECT pg_temp.expect('해제 일자 없이 해제 관리자 거부', $q$UPDATE member_suspension SET lifted_by=3 WHERE id=1$q$, '23514');
SELECT pg_temp.expect('자동 해제(관리자 없음) 허용', $q$UPDATE member_suspension SET lifted_at=now() WHERE id=1$q$, NULL);
SELECT pg_temp.expect('다른 참조 없는 회원 정지', $q$INSERT INTO member_suspension (member_id,reason,suspended_by) VALUES (4,'도배',3)$q$, NULL);
SELECT pg_temp.expect('정지 이력이 있는 회원 삭제 RESTRICT', $q$DELETE FROM member WHERE id=4$q$, '23001');
INSERT INTO post (author_id,title) VALUES (1,'a'),(1,'b');
INSERT INTO comment (post_id,author_id,content) VALUES (2,1,'부모');
SELECT pg_temp.expect('다른 글의 댓글을 부모로 지정 거부', $q$INSERT INTO comment (post_id,author_id,parent_id,content) VALUES (3,1,2,'x')$q$, '23503');
-- 프로필 사진 (2026-10-07: 회원 테이블의 프로필 컬럼을 없애고 사진 테이블을 JOIN)
INSERT INTO image (uploader_id, storage_key, content_type, size_bytes, status, purpose) VALUES (1, 'images/p1.webp', 'image/webp', 100, 'ATTACHED', 'PROFILE');
SELECT pg_temp.expect('회원당 사용 중인 프로필 사진 두 개 거부', $q$INSERT INTO image (uploader_id, storage_key, content_type, size_bytes, status, purpose) VALUES (1, 'images/p2.webp', 'image/webp', 100, 'ATTACHED', 'PROFILE')$q$, '23505');
UPDATE image SET detached_at = now() WHERE storage_key = 'images/p1.webp';
SELECT pg_temp.expect('이전 사진을 떼면 새 프로필 사진 허용', $q$INSERT INTO image (uploader_id, storage_key, content_type, size_bytes, status, purpose) VALUES (1, 'images/p2.webp', 'image/webp', 100, 'ATTACHED', 'PROFILE')$q$, NULL);
SELECT pg_temp.expect('목록 JOIN은 회원당 한 줄, 지금 사진만', $q$DO $d$ BEGIN IF (SELECT count(*) FROM member m LEFT JOIN image pi ON pi.uploader_id = m.id AND pi.purpose = 'PROFILE' AND pi.status = 'ATTACHED' AND pi.detached_at IS NULL WHERE m.id = 1) <> 1 OR (SELECT pi.storage_key FROM member m JOIN image pi ON pi.uploader_id = m.id AND pi.purpose = 'PROFILE' AND pi.status = 'ATTACHED' AND pi.detached_at IS NULL WHERE m.id = 1) <> 'images/p2.webp' THEN RAISE EXCEPTION 'bad'; END IF; END $d$$q$, NULL);
-- E4 (2026-10-07): 한 대상에 대기 중인 신고 사건은 하나
INSERT INTO post (author_id, title) VALUES (2, 'E4 대상 글');
SELECT pg_temp.expect('대기 중 사건 생성', $q$INSERT INTO report_case (target_type, post_id, target_author_id) SELECT 'POST', max(id), 2 FROM post$q$, NULL);
SELECT pg_temp.expect('같은 글에 대기 중 사건 두 개 거부', $q$INSERT INTO report_case (target_type, post_id, target_author_id) SELECT 'POST', max(id), 2 FROM post$q$, '23505');
SELECT pg_temp.expect('처리된 뒤에는 새 사건 허용 (재신고)', $q$DO $d$ BEGIN UPDATE report_case SET status = 'REJECTED', handled_at = now() WHERE post_id = (SELECT max(id) FROM post); INSERT INTO report_case (target_type, post_id, target_author_id) SELECT 'POST', max(id), 2 FROM post; END $d$$q$, NULL);
SELECT n, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END, name, CASE WHEN ok THEN '' ELSE got END FROM r ORDER BY n;
SELECT count(*) FILTER (WHERE ok) AS pass, count(*) FILTER (WHERE NOT ok) AS fail FROM r;
ROLLBACK;
