\set p random(2, 20000)
BEGIN;
WITH par AS (SELECT c.id, c.post_id FROM c_clo c WHERE c.post_id = :p
             AND NOT EXISTS (SELECT 1 FROM c_tree t WHERE t.descendant_id = c.id AND t.depth = 1) LIMIT 1),
     n AS (INSERT INTO c_clo SELECT nextval('cseq'), post_id, 1, 'new reply', now(), NULL, NULL FROM par RETURNING id)
INSERT INTO c_tree SELECT n.id, n.id, 0 FROM n UNION ALL SELECT par.id, n.id, 1 FROM n, par;
COMMIT;
