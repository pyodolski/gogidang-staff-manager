-- 중복 근무 기록 정리 및 UNIQUE 제약조건 추가

-- 1단계: 중복 데이터 확인
SELECT 
    user_id, 
    date, 
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ' ORDER BY created_at DESC) as record_ids,
    STRING_AGG(status, ', ' ORDER BY created_at DESC) as statuses,
    STRING_AGG(work_type, ', ' ORDER BY created_at DESC) as work_types
FROM work_logs 
GROUP BY user_id, date 
HAVING COUNT(*) > 1
ORDER BY user_id, date;

-- 2단계: 중복 데이터 정리 (가장 최근 기록만 유지)
-- 주의: 이 작업은 데이터를 삭제합니다. 실행 전 백업을 권장합니다.

DO $$ 
DECLARE
    duplicate_record RECORD;
    records_to_keep INTEGER[];
    records_to_delete INTEGER[];
BEGIN
    -- 중복된 각 그룹에 대해 처리
    FOR duplicate_record IN 
        SELECT user_id, date
        FROM work_logs 
        GROUP BY user_id, date 
        HAVING COUNT(*) > 1
    LOOP
        -- 해당 그룹의 모든 레코드를 최신순으로 정렬하여 가져오기
        SELECT ARRAY_AGG(id ORDER BY created_at DESC, id DESC) 
        INTO records_to_keep
        FROM work_logs 
        WHERE user_id = duplicate_record.user_id 
        AND date = duplicate_record.date;
        
        -- 첫 번째(가장 최근) 레코드만 유지하고 나머지는 삭제 대상으로 설정
        records_to_delete := records_to_keep[2:array_length(records_to_keep, 1)];
        
        -- 삭제할 레코드들 정보 출력
        RAISE NOTICE '사용자 %, 날짜 %: 총 % 개 레코드 중 % 개 삭제 예정 (유지: %, 삭제: %)', 
            duplicate_record.user_id, 
            duplicate_record.date,
            array_length(records_to_keep, 1),
            array_length(records_to_delete, 1),
            records_to_keep[1],
            array_to_string(records_to_delete, ', ');
        
        -- 중복 레코드 삭제 (가장 최근 것 제외)
        IF array_length(records_to_delete, 1) > 0 THEN
            DELETE FROM work_logs 
            WHERE id = ANY(records_to_delete);
        END IF;
    END LOOP;
    
    RAISE NOTICE '중복 데이터 정리가 완료되었습니다.';
END $$;

-- 3단계: 정리 후 중복 확인
SELECT 
    user_id, 
    date, 
    COUNT(*) as count
FROM work_logs 
GROUP BY user_id, date 
HAVING COUNT(*) > 1;

-- 4단계: UNIQUE 제약조건 추가
DO $$ 
BEGIN
    -- 중복이 없는지 다시 한번 확인
    IF EXISTS (
        SELECT 1 FROM work_logs 
        GROUP BY user_id, date 
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION '아직 중복 데이터가 존재합니다. 먼저 중복을 제거해주세요.';
    END IF;
    
    -- UNIQUE 제약조건 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'work_logs_user_date_unique' 
        AND table_name = 'work_logs'
    ) THEN
        ALTER TABLE work_logs 
        ADD CONSTRAINT work_logs_user_date_unique 
        UNIQUE (user_id, date);
        RAISE NOTICE 'UNIQUE 제약조건이 성공적으로 추가되었습니다.';
    ELSE
        RAISE NOTICE 'UNIQUE 제약조건이 이미 존재합니다.';
    END IF;
END $$;

-- 5단계: 트리거 함수 생성
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

-- 6단계: 트리거 생성
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