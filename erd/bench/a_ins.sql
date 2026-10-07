\set p random(2, 20000)
INSERT INTO c_adj (post_id, parent_id, author_id, content, created_at)
SELECT post_id, id, 1, 'new reply', now() FROM c_adj WHERE post_id = :p AND parent_id IS NULL LIMIT 1;
