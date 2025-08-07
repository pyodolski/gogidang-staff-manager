-- Super 역할 추가를 위한 데이터베이스 업데이트

-- 1. profiles 테이블의 role 체크 제약조건 업데이트
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('employee', 'admin', 'super'));

-- 2. work_logs 테이블 RLS 정책 업데이트 (Super 권한 추가)
DROP POLICY IF EXISTS "Admin can manage all work logs" ON work_logs;
CREATE POLICY "Admin and Super can manage all work logs" ON work_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super')
        )
    );

-- 3. profiles 테이블 RLS 정책 업데이트 (Super 권한 추가)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins and Super can manage all profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super')
        )
    );

-- 4. salary_deductions 테이블 RLS 정책 업데이트 (Super 권한 추가)
DROP POLICY IF EXISTS "Admin can manage all salary deductions" ON salary_deductions;
CREATE POLICY "Admin and Super can manage all salary deductions" ON salary_deductions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super')
        )
    );

-- 5. Super 전용 정책 추가 (직원 삭제 및 권한 변경)
CREATE POLICY "Super can delete profiles" ON profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super'
        )
    );

-- 6. 기존 admin 계정을 super로 승격하고 싶다면 (선택사항)
-- UPDATE profiles SET role = 'super' WHERE email = 'your-admin-email@gmail.com';

COMMENT ON TABLE profiles IS 'User profiles with role hierarchy: employee < admin < super';