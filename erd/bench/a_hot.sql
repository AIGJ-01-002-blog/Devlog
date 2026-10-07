\set p random(1, 1)
SELECT c.id, (SELECT count(*) FROM c_adj x WHERE x.parent_id = c.id) AS reply_count, r.id AS reply_id
FROM (SELECT id, created_at FROM c_adj WHERE post_id = :p AND parent_id IS NULL ORDER BY created_at, id LIMIT 20) c
LEFT JOIN LATERAL (SELECT id FROM c_adj x WHERE x.parent_id = c.id ORDER BY created_at, id LIMIT 3) r ON true;
