-- 3단계: 제약조건 수정
-- clock_in, clock_out NULL 허용으로 변경
ALTER TABLE work_logs ALTER COLUMN clock_in DROP NOT NULL;
ALTER TABLE work_logs ALTER COLUMN clock_out DROP NOT NULL;

-- work_type에 체크 제약조건 추가 (이미 있으면 무시)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'work_type_check'
    ) THEN
        ALTER TABLE work_logs 
        ADD CONSTRAINT work_type_check CHECK (work_type IN ('work', 'day_off', 'bonus'));
        RAISE NOTICE 'work_type 체크 제약조건이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'work_type 체크 제약조건이 이미 존재합니다.';
    END IF;
END $$;