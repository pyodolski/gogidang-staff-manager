-- 1단계: work_type 컬럼만 먼저 추가
DO $$ 
BEGIN
    -- work_type 컬럼이 존재하지 않으면 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_logs' AND column_name = 'work_type'
    ) THEN
        ALTER TABLE work_logs ADD COLUMN work_type VARCHAR(20) DEFAULT 'work';
        RAISE NOTICE 'work_type 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'work_type 컬럼이 이미 존재합니다.';
    END IF;
END $$;