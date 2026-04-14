-- profiles 테이블에 is_approved 컬럼 추가
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- 기존 직원(employee)은 모두 승인 상태로 설정
UPDATE profiles
SET is_approved = true
WHERE is_approved IS NULL OR is_approved = false;

-- admin, super는 항상 승인 상태
UPDATE profiles
SET is_approved = true
WHERE role IN ('admin', 'super');

COMMENT ON COLUMN profiles.is_approved IS '관리자가 승인한 계정만 로그인 가능';
