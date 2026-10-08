-- 하이브리드 검색(spec 054)의 글 임베딩. pgvector 확장이 있을 때만 만든다.
-- 학교·Crowfoot 공용 DB처럼 확장 생성 권한이 없으면 표를 만들지 않고 넘어가며, 그때 검색은 지금처럼 키워드만 쓴다 (V2와 같은 방식).
-- 차원은 모델마다 달라(bge-m3 1024, Gemini 768) 열에 고정하지 않고, 행마다 모델 이름을 적어 같은 모델끼리만 비교한다.
-- 글이 수만 개를 넘어 정확 탐색이 느려지면 모델을 하나로 정한 뒤 차원을 고정하고 HNSW 인덱스를 더한다.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector 확장을 만들 수 없어 글 임베딩 표 없이 진행합니다: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
        CREATE TABLE IF NOT EXISTS post_embedding (
            post_id        bigint       NOT NULL,
            model          varchar(100) NOT NULL,
            source_version bigint       NOT NULL,
            embedding      vector       NOT NULL,
            updated_at     timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (post_id),
            CONSTRAINT fk_post_embedding_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS ix_post_embedding_model ON post_embedding (model);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '글 임베딩 표를 건너뜁니다: %', SQLERRM;
END $$;
