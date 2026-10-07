-- 검색 벤치마크 데이터: 회원 100명, 글 10만 개 + 결과를 확인할 표식 (run.sh가 사용)
insert into member(handle,nickname)
  select 'user'||lpad(g::text,3,'0'), '회원'||g from generate_series(1,100) g;
insert into tag(name) values ('spring'),('jpa'),('docker'),('redis'),('롬복');
insert into post(author_id,title,content_md,status,visibility,published_at,first_public_at)
select 1+g%100,
  (array['스프링','트랜잭션','배포','자바','인덱스','쿼리','도커','레디스','검색','성능'])[1+g%10] || ' ' || (array['정리','회고','문제 해결','입문','심화'])[1+(g/10)%5] || ' ' || g,
  repeat((array['오늘은 스프링 트랜잭션 전파 속성을 공부하면서 REQUIRED와 REQUIRES_NEW의 차이를 직접 실험해 보았다. ','도커 컴포즈로 애플리케이션과 데이터베이스를 함께 띄우는 배포 환경을 구성했다. ','레디스 캐시를 붙여서 자주 조회되는 데이터의 응답 시간을 크게 줄일 수 있었다. ','실행 계획을 보면서 인덱스가 실제로 쓰이는지 하나씩 확인하는 과정을 정리했다. '])[1+g%4], 40),
  'PUBLISHED','PUBLIC', timestamptz '2026-01-01' + g * interval '1 minute', timestamptz '2026-01-01' + g * interval '1 minute'
from generate_series(1,100000) g;
-- 표식: 제목 / 태그 / 본문에만 '롬복', 드문 단어 '희귀어사전', 볼 수 없는 글
update post set title = title || ' 롬복 설정' where id in (99990, 50000, 10);
insert into post_tag(post_id,tag_id,position) select id, (select id from tag where name='롬복'), 0 from post where id in (99980, 60000, 20);
update post set content_md = content_md || ' 롬복 어노테이션 정리 ' where id in (99970, 70000, 30);
update post set content_md = content_md || ' 희귀어사전 ' where id % 5000 = 1;
update post set title = title || ' 희귀어사전' where id = 77777;
update post set visibility='PRIVATE', title = title || ' 롬복 비공개' where id = 99999;
update post set deleted_at = now(), title = title || ' 롬복 휴지통' where id = 99998;
update member set status='WITHDRAWN', withdrawn_at=now() where id = (select author_id from post where id = 99997);
update post set title = title || ' 롬복 탈퇴자' where id = 99997;
update post set title='100% 할인 이벤트 정리' where id=99960; update post set title='100X 할인 이벤트 정리' where id=99961;
update post set title='snake_case 규칙' where id=99962; update post set title='snakeXcase 규칙' where id=99963;
