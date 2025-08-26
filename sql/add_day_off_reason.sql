-- 휴무 사유 컬럼 추가

-- work_logs 테이블에 day_off_reason 컬럼 추가
ALTER TABLE work_logs 
ADD COLUMN day_off_reason TEXT;

-- 컬럼에 대한 설명 추가
COMMENT ON COLUMN work_logs.day_off_reason IS '휴무 사유 (work_type이 day_off일 때 사용)';

-- 기존 휴무 기록에 기본값 설정 (선택사항)
UPDATE work_logs 
SET day_off_reason = '사유 미입력' 
WHERE work_type = 'day_off' 
AND day_off_reason IS NULL;

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_work_logs_day_off_reason 
ON work_logs(day_off_reason) 
WHERE work_type = 'day_off';

RAISE NOTICE '휴무 사유 컬럼이 성공적으로 추가되었습니다.';