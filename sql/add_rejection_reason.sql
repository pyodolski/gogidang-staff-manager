-- work_logs 테이블에 거절 사유 컬럼 추가
ALTER TABLE work_logs 
ADD COLUMN rejection_reason TEXT;

-- 기존 거절된 기록들에 대한 기본 사유 설정 (선택사항)
UPDATE work_logs 
SET rejection_reason = '사유 없음' 
WHERE status = 'rejected' AND rejection_reason IS NULL;