DROP TABLE IF EXISTS c_adj, c_clo, c_tree CASCADE;
-- A: 지금 방식 (인접 + 깊이 1 FK)
CREATE TABLE c_adj (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id bigint NOT NULL, parent_id bigint, author_id bigint NOT NULL,
  content varchar(1000) NOT NULL, created_at timestamptz NOT NULL,
  deleted_at timestamptz, hidden_at timestamptz,
  is_root boolean GENERATED ALWAYS AS (parent_id IS NULL) STORED,
  parent_is_root boolean GENERATED ALWAYS AS (CASE WHEN parent_id IS NULL THEN NULL ELSE true END) STORED,
  UNIQUE (post_id, id, is_root),
  FOREIGN KEY (post_id, parent_id, parent_is_root) REFERENCES c_adj (post_id, id, is_root) ON DELETE CASCADE);
CREATE INDEX ca_root ON c_adj (post_id, created_at, id) WHERE parent_id IS NULL;
CREATE INDEX ca_reply ON c_adj (parent_id, created_at, id) WHERE parent_id IS NOT NULL;
-- B: 클로저 테이블 (parent_id 없음, 계층은 c_tree)
CREATE TABLE c_clo (
  id bigint PRIMARY KEY, post_id bigint NOT NULL, author_id bigint NOT NULL,
  content varchar(1000) NOT NULL, created_at timestamptz NOT NULL, deleted_at timestamptz, hidden_at timestamptz);
CREATE TABLE c_tree (ancestor_id bigint NOT NULL REFERENCES c_clo(id) ON DELETE CASCADE,
  descendant_id bigint NOT NULL REFERENCES c_clo(id) ON DELETE CASCADE, depth smallint NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id));
CREATE INDEX ct_desc ON c_tree (descendant_id, depth);
CREATE INDEX cc_post ON c_clo (post_id, created_at, id);

-- 데이터: 글 20,000개, 글마다 최상위 10개(인기 글 1번은 2,000개), 최상위마다 답글 4개(인기 글은 최상위마다 10개)
INSERT INTO c_adj (post_id, parent_id, author_id, content, created_at)
SELECT p, NULL, (random()*10000)::int, 'root', now() - make_interval(secs => r*60)
FROM generate_series(1,20000) p, generate_series(1, CASE WHEN p=1 THEN 2000 ELSE 10 END) r;
INSERT INTO c_adj (post_id, parent_id, author_id, content, created_at)
SELECT c.post_id, c.id, (random()*10000)::int, 'reply', c.created_at + make_interval(secs => k)
FROM c_adj c, generate_series(1, CASE WHEN c.post_id=1 THEN 10 ELSE 4 END) k WHERE c.parent_id IS NULL;
INSERT INTO c_clo SELECT id, post_id, author_id, content, created_at, deleted_at, hidden_at FROM c_adj;
INSERT INTO c_tree SELECT id, id, 0 FROM c_adj;
INSERT INTO c_tree SELECT parent_id, id, 1 FROM c_adj WHERE parent_id IS NOT NULL;
VACUUM ANALYZE c_adj; VACUUM ANALYZE c_clo; VACUUM ANALYZE c_tree;
SELECT (SELECT count(*) FROM c_adj) comments, (SELECT count(*) FROM c_tree) tree_rows,
 pg_size_pretty(pg_total_relation_size('c_adj')) adj_size,
 pg_size_pretty(pg_total_relation_size('c_clo')+pg_total_relation_size('c_tree')) closure_size;
