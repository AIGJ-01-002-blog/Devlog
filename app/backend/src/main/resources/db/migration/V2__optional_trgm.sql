-- 부분 일치 검색용 pg_trgm 확장과 trgm 인덱스 (docs/51 V1에 있던 것을 분리).
-- 학교·Crowfoot 공용 DB에는 확장 생성 권한이 없을 수 있다. 실패해도 마이그레이션은 계속하고,
-- 그때 검색은 인덱스 없는 LIKE로 동작한다 (2026-10-07 인프라 스레드 추천안).
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm 확장을 만들 수 없어 trgm 인덱스 없이 진행합니다: %', SQLERRM;
END $$;

DO $$
DECLARE
    stmt text;
BEGIN
    FOREACH stmt IN ARRAY ARRAY[
        'CREATE INDEX IF NOT EXISTS ix_member_nickname_trgm ON member USING gin (nickname gin_trgm_ops)',
        'CREATE INDEX IF NOT EXISTS ix_member_handle_trgm ON member USING gin (handle gin_trgm_ops)',
        'CREATE INDEX IF NOT EXISTS ix_post_title_trgm ON post USING gin (title gin_trgm_ops)',
        'CREATE INDEX IF NOT EXISTS ix_post_content_trgm ON post USING gin (content_md gin_trgm_ops)'
    ] LOOP
        BEGIN
            EXECUTE stmt;
        EXCEPTION WHEN OTHERS THEN
            -- 확장이 없거나 다른 스키마에 있어 연산자 클래스를 찾지 못한 경우
            RAISE NOTICE 'trgm 인덱스를 건너뜁니다 (%): %', stmt, SQLERRM;
        END;
    END LOOP;
END $$;
