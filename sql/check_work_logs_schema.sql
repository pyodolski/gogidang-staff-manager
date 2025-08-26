-- work_logs 테이블의 현재 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'work_logs' 
ORDER BY ordinal_position;

-- work_type 컬럼이 존재하는지 확인
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns 
  WHERE table_name = 'work_logs' 
  AND column_name = 'work_type'
) as work_type_exists;