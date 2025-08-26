-- 2단계: 기존 데이터 업데이트
UPDATE work_logs 
SET work_type = 'work' 
WHERE work_type IS NULL OR work_type = '';

-- 업데이트된 행 수 확인
SELECT COUNT(*) as updated_rows 
FROM work_logs 
WHERE work_type = 'work';