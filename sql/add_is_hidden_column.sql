-- profiles 테이블에 is_hidden 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_is_hidden ON profiles(is_hidden);

-- 기존 직원들은 모두 표시 상태로 설정
UPDATE profiles 
SET is_hidden = false 
WHERE is_hidden IS NULL;

-- 코멘트 추가
COMMENT ON COLUMN profiles.is_hidden IS '퇴사/휴직 등으로 숨김 처리된 직원 (super 관리자만 토글 가능)';
