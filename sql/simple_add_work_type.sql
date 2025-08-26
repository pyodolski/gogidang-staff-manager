-- 가장 간단한 방법: work_type 컬럼만 추가
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS work_type TEXT DEFAULT 'work';

-- 기존 데이터 업데이트
UPDATE work_logs SET work_type = 'work' WHERE work_type IS NULL OR work_type = '';

-- 확인 쿼리
SELECT COUNT(*) as total_rows, 
       COUNT(CASE WHEN work_type = 'work' THEN 1 END) as work_rows,
       COUNT(CASE WHEN work_type IS NULL THEN 1 END) as null_rows
FROM work_logs;