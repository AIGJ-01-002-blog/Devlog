#!/usr/bin/env bash
# 통합 ERD(erd/V1__common_schema.sql)를 PostgreSQL에 적용하고, 문서에 적힌 규칙대로 제약조건이 허용/거부하는지 확인한다.
# 이어서 06 친구 공개(FRIENDS) 규격, 담당자 문서(20~49)의 "ERD 변경 제안" 중 V1에 아직 없는 것을 적용해 본다.
# 2026-10-07부터 기준은 V1이다 (03의 DDL은 기록용).
# 사용: scripts/check-ddl.sh        (Docker 필요)
source "$(dirname "$0")/lib/common.sh"

echo "== 1. 통합 스키마 적용 (erd/V1__common_schema.sql)"
start_pg ddl
qf < "$V1" || { echo "스키마 적용 실패"; exit 1; }
echo "   테이블 $(q "select count(*) from information_schema.tables where table_schema='public'")개"

M="insert into member(handle,nickname) values"
mid() { echo "(select id from member where handle='$1')"; }

echo; echo "== 2. 회원·로그인 (07·08·09)"
check ok   "회원 생성"                                  "$M ('kim755030','김민서'),('go-kim755030','구글김'),('gi-kim755030','깃김'),('bob_2','밥이')"
check fail "대문자 블로그 주소"                          "$M ('GOkim','대문자')"
check fail "정하지 않은 접두어(xx-)"                     "$M ('xx-kim','접두어')"
check fail "접두어가 아닌 하이픈"                        "$M ('kim-min','하이픈')"
check fail "끝이 밑줄"                                   "$M ('kim_','밑줄끝')"
check fail "블로그 주소 중복"                            "$M ('kim755030','다른김')"
check ok   "닉네임 Kim"                                 "$M ('user001','Kim')"
check fail "닉네임 대소문자만 다름 (kim)"                "$M ('user002','kim')"
check ok   "닉네임 KIM2는 다른 닉네임"                   "$M ('user003','KIM2')"
check fail "닉네임 숫자만"                               "$M ('user004','12345')"
check fail "닉네임 자음만"                               "$M ('user005','ㅋㅋ')"
check fail "닉네임 11자"                                 "$M ('user006','가나다라마바사아자차카')"
check ok   "이메일 가입"                                 "insert into auth_identity(member_id,provider,provider_user_id,email,password_hash) values ($(mid kim755030),'LOCAL','kim755030@naver.com','kim755030@naver.com','h')"
check ok   "같은 이메일의 Google → 별도 계정"            "insert into auth_identity(member_id,provider,provider_user_id,email,email_verified_at) values ($(mid go-kim755030),'GOOGLE','109','kim755030@naver.com',now())"
check fail "같은 이메일로 이메일 가입 두 번"             "insert into auth_identity(member_id,provider,provider_user_id,email,password_hash) values ($(mid bob_2),'LOCAL','kim755030@naver.com','kim755030@naver.com','h')"
check fail "한 계정에 로그인 수단 2개"                   "insert into auth_identity(member_id,provider,provider_user_id) values ($(mid kim755030),'GITHUB','999')"
check fail "이메일 가입인데 비밀번호 없음"               "insert into auth_identity(member_id,provider,provider_user_id,email) values ($(mid bob_2),'LOCAL','b@x.com','b@x.com')"
check fail "이메일 가입 대문자 이메일"                   "insert into auth_identity(member_id,provider,provider_user_id,email,password_hash) values ($(mid bob_2),'LOCAL','B@x.com','B@x.com','h')"
check ok   "동의 3종 저장 (버전 포함)"                  "insert into member_agreement(member_id,type,version) select $(mid kim755030), t, '2026-10-07' from unnest(array['TERMS','PRIVACY','AI']) t"
check fail "동의 버전 없이 저장"                         "insert into member_agreement(member_id,type) values ($(mid bob_2),'TERMS')"
check fail "모르는 동의 종류"                            "insert into member_agreement(member_id,type,version) values ($(mid bob_2),'MARKETING','v1')"
check fail "소개 201자"                                  "update member set bio=repeat('가',201) where handle='bob_2'"

echo; echo "== 3. 글·발행·공개 범위 (05·06)"
A=$(mid kim755030)
check ok   "제목 없는 임시글"                            "insert into post(author_id) values ($A)"
check fail "published_at 없이 발행"                      "insert into post(author_id,title,status,visibility) values ($A,'t','PUBLISHED','PRIVATE')"
check fail "공개 발행인데 first_public_at 없음"          "insert into post(author_id,title,status,published_at) values ($A,'t','PUBLISHED',now())"
check fail "공백뿐인 제목으로 발행"                      "insert into post(author_id,title,status,visibility,published_at) values ($A,'   ','PUBLISHED','PRIVATE',now())"
check fail "수정 시각이 발행보다 이름"                   "insert into post(author_id,title,status,visibility,published_at,edited_at) values ($A,'t','PUBLISHED','PRIVATE',now(),now()-interval '1 day')"
check fail "본문 100,000자 초과"                         "insert into post(author_id,content_md) values ($A,repeat('a',100001))"
check fail "공통 스키마에 FRIENDS 공개 범위"             "insert into post(author_id,visibility) values ($A,'FRIENDS')"
check ok   "공개 발행 글"                                "insert into post(author_id,title,content_md,status,visibility,published_at,first_public_at) values ($A,'발행글','본문','PUBLISHED','PUBLIC',now(),now())"
P=$(q "select id from post where title='발행글'")

echo; echo "== 4. 자동 저장 작업본 (04)"
q "insert into post_draft(post_id,title,content_md,edit_version) values ($P,'수정','v5',5)" >/dev/null
q "insert into post_draft(post_id,title,content_md,edit_version) values ($P,'수정','v3',3) on conflict (post_id) do update set content_md=excluded.content_md, edit_version=excluded.edit_version where post_draft.edit_version < excluded.edit_version" >/dev/null
expect "늦게 온 옛 버전이 작업본을 덮어쓰지 않음" "$(q "select content_md from post_draft where post_id=$P")" "v5"
expect "작업본이 있어도 독자는 발행본"            "$(q "select content_md from post where id=$P")" "본문"

echo; echo "== 5. 태그·댓글·좋아요 (C-TAG·C-CMT·30)"
check ok   "태그 (입력 순서 포함)"                       "insert into tag(name) values ('spring'),('jpa'); insert into post_tag(post_id,tag_id,position) select $P, id, row_number() over (order by id) - 1 from tag"
check fail "정규화 안 된 태그"                           "insert into tag(name) values (' Spring')"
check fail "글-태그 중복"                                "insert into post_tag(post_id,tag_id,position) select $P, id, 9 from tag where name='jpa'"
check fail "같은 글에서 입력 순서 중복"                  "insert into tag(name) values ('docker'); insert into post_tag(post_id,tag_id,position) select $P, id, 0 from tag where name='docker'"
check ok   "댓글 + 답글"                                 "insert into comment(post_id,author_id,content) values ($P,$(mid bob_2),'댓글'); insert into comment(post_id,author_id,parent_id,content) values ($P,$A,(select min(id) from comment),'답글')"
check fail "삭제되지 않은 빈 댓글"                       "insert into comment(post_id,author_id,content) values ($P,$A,'  ')"
check ok   "삭제된 댓글은 내용을 비울 수 있음"           "update comment set content='', deleted_at=now() where parent_id is null"
LIKE="with ins as (insert into post_like(post_id,member_id) values ($P,$(mid bob_2)) on conflict do nothing returning post_id) update post set like_count=like_count+1 where id in (select post_id from ins)"
q "$LIKE" >/dev/null; q "$LIKE" >/dev/null
expect "같은 사람 좋아요 두 번 → 1"               "$(q "select like_count from post where id=$P")" "1"

echo; echo "== 6. 이미지 (04·10·11)"
check ok   "글 사진 + 썸네일"                            "insert into image(uploader_id,storage_key,thumb_storage_key,content_type,size_bytes,width,height) values ($A,'a.webp','a_thumb.webp','image/webp',300000,1920,1080)"
check fail "10MB 초과"                                   "insert into image(uploader_id,storage_key,content_type,size_bytes) values ($A,'b.webp','image/webp',10485761)"
check fail "SVG"                                         "insert into image(uploader_id,storage_key,content_type,size_bytes) values ($A,'c.svg','image/svg+xml',10)"
check fail "알 수 없는 purpose"                          "insert into image(uploader_id,storage_key,content_type,size_bytes,purpose) values ($A,'d.webp','image/webp',10,'AVATAR')"
check ok   "프로필 사진 연결 (사진 쪽 ATTACHED)"        "insert into image(uploader_id,storage_key,content_type,size_bytes,width,height,purpose,status) values ($A,'p.webp','image/webp',20000,256,256,'PROFILE','ATTACHED')"
check fail "사용 중인 프로필 사진 두 개"                 "insert into image(uploader_id,storage_key,content_type,size_bytes,width,height,purpose,status) values ($A,'p2.webp','image/webp',20000,256,256,'PROFILE','ATTACHED')"

echo; echo "== 7. 휴지통·탈퇴 (13)"
check fail "활동 중인 회원의 닉네임 비우기"              "update member set nickname=null where handle='bob_2'"
check fail "탈퇴 시각 없이 WITHDRAWN"                    "update member set status='WITHDRAWN' where handle='bob_2'"
check fail "활동 중인 회원에 deleted_at"                 "update member set deleted_at=now() where handle='bob_2'"
check ok   "탈퇴 신청 → 익명 처리"                       "update member set status='WITHDRAWN', withdrawn_at=now() where handle='bob_2'; delete from auth_identity where member_id=$(mid bob_2); update member set nickname=null, deleted_at=now() where handle='bob_2'"
check ok   "해제된 닉네임을 다른 사람이 사용"            "$M ('newbie','밥이')"
check fail "탈퇴한 사람의 블로그 주소 재사용"            "$M ('bob_2','새밥')"
check ok   "글 완전 삭제 → 연결 데이터 CASCADE"          "delete from post where id=$P"
expect "남은 댓글·좋아요·글-태그·작업본"          "$(q "select (select count(*) from comment)||'/'||(select count(*) from post_like)||'/'||(select count(*) from post_tag)||'/'||(select count(*) from post_draft)")" "0/0/0/0"

echo; echo "== 8. 친구 공개(FRIENDS) 규격 (06 §6, 선택 구현 — friendship 테이블은 V1에 있음)"
if $EXTRACT block "$DOCS/06-visibility.md" sql "ix_post_blog_friends" | qf; then
  echo "   적용 OK"
  check ok   "규격 적용 후 FRIENDS 허용"                 "insert into post(author_id,visibility) values ($A,'FRIENDS')"
  check fail "친구 관계 역순 저장"                       "insert into friendship(member_a_id,member_b_id,requested_by) values ($(mid newbie),$A,$A)"
else FAIL=$((FAIL+1)); echo "FAIL  친구 공개 규격 적용"; fi

echo; echo "== 9. 담당자 문서의 ERD 변경 제안 중 V1에 아직 없는 것 (20~49)"
PROP=$($EXTRACT proposals "$DOCS")
if [ -z "$PROP" ]; then echo "   (V1에 아직 반영되지 않은 제안 없음)"
else
  echo "$PROP" | grep '^-- from' | sed 's/^-- from /   대상: /'
  if echo "$PROP" | qf; then PASS=$((PASS+1)); echo "PASS  제안 SQL이 V1 위에 적용됨"; else FAIL=$((FAIL+1)); echo "FAIL  제안 SQL 적용"; fi
fi

summary
