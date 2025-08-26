-- 4단계: 트리거 함수 및 트리거 생성
-- 휴무일 체크를 위한 함수
CREATE OR REPLACE FUNCTION check_day_off_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- 같은 날짜에 이미 휴무가 등록되어 있는지 확인
  IF EXISTS (
    SELECT 1 FROM work_logs 
    WHERE user_id = NEW.user_id 
    AND date = NEW.date 
    AND work_type = 'day_off'
    AND id != COALESCE(NEW.id, 0)
  ) THEN
    RAISE EXCEPTION '해당 날짜는 이미 휴무로 등록되어 있습니다.';
  END IF;
  
  -- 같은 날짜에 이미 근무가 등록되어 있고, 새로 등록하려는 것이 휴무인 경우
  IF NEW.work_type = 'day_off' AND EXISTS (
    SELECT 1 FROM work_logs 
    WHERE user_id = NEW.user_id 
    AND date = NEW.date 
    AND work_type = 'work'
    AND id != COALESCE(NEW.id, 0)
  ) THEN
    RAISE EXCEPTION '해당 날짜에 이미 근무가 등록되어 있습니다.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거 삭제 후 새로 생성
DROP TRIGGER IF EXISTS check_day_off_conflict_trigger ON work_logs;
CREATE TRIGGER check_day_off_conflict_trigger
  BEFORE INSERT OR UPDATE ON work_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_day_off_conflict();

RAISE NOTICE '휴무일 충돌 방지 트리거가 생성되었습니다.';