-- 4단계: 중복 근무 기록 방지를 위한 UNIQUE 제약조건 및 트리거 생성

-- 먼저 UNIQUE 제약조건 추가 (동일 사용자, 동일 날짜에 하나의 기록만 허용)
DO $$ 
BEGIN
    -- 기존 제약조건이 있는지 확인하고 없으면 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'work_logs_user_date_unique' 
        AND table_name = 'work_logs'
    ) THEN
        ALTER TABLE work_logs 
        ADD CONSTRAINT work_logs_user_date_unique 
        UNIQUE (user_id, date);
        RAISE NOTICE 'UNIQUE 제약조건이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'UNIQUE 제약조건이 이미 존재합니다.';
    END IF;
END $$;

-- 중복 근무 기록 방지를 위한 함수
CREATE OR REPLACE FUNCTION check_work_log_duplicate()
RETURNS TRIGGER AS $$
BEGIN
  -- 같은 날짜에 이미 기록이 있는지 확인 (수정 시에는 자기 자신 제외)
  IF EXISTS (
    SELECT 1 FROM work_logs 
    WHERE user_id = NEW.user_id 
    AND date = NEW.date 
    AND id != COALESCE(NEW.id, 0)
  ) THEN
    RAISE EXCEPTION '해당 날짜(%s)에 이미 근무 기록이 존재합니다. 하루에 하나의 근무 기록만 등록할 수 있습니다.', NEW.date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거 삭제 후 새로 생성
DO $$ 
BEGIN
    -- 기존 트리거들 삭제
    DROP TRIGGER IF EXISTS check_day_off_conflict_trigger ON work_logs;
    DROP TRIGGER IF EXISTS check_work_log_duplicate_trigger ON work_logs;
    
    -- 새 트리거 생성
    CREATE TRIGGER check_work_log_duplicate_trigger
      BEFORE INSERT OR UPDATE ON work_logs
      FOR EACH ROW
      EXECUTE FUNCTION check_work_log_duplicate();
    
    RAISE NOTICE '중복 근무 기록 방지 트리거가 생성되었습니다.';
END $$;