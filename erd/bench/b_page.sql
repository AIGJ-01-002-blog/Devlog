\set p random(1, 20000)
SELECT c.id, (SELECT count(*) FROM c_tree t WHERE t.ancestor_id = c.id AND t.depth = 1) AS reply_count, r.id AS reply_id
FROM (SELECT id, created_at FROM c_clo c WHERE post_id = :p
        AND NOT EXISTS (SELECT 1 FROM c_tree t WHERE t.descendant_id = c.id AND t.depth = 1)
      ORDER BY created_at, id LIMIT 20) c
LEFT JOIN LATERAL (SELECT x.id FROM c_tree t JOIN c_clo x ON x.id = t.descendant_id
                   WHERE t.ancestor_id = c.id AND t.depth = 1 ORDER BY x.created_at, x.id LIMIT 3) r ON true;
