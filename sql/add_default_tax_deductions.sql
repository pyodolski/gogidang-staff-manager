-- 기본 세금 공제 항목을 모든 직원에게 추가하는 스크립트
-- 이미 존재하는 경우 중복 추가를 방지합니다.

-- 모든 직원에게 소득세 (3%) 공제 항목 추가
INSERT INTO salary_deductions (user_id, name, amount, type, is_active, created_at)
SELECT 
    id as user_id,
    '소득세' as name,
    3 as amount,
    'percentage' as type,
    true as is_active,
    NOW() as created_at
FROM profiles 
WHERE role IN ('employee', 'admin', 'super')
AND id NOT IN (
    SELECT user_id 
    FROM salary_deductions 
    WHERE name = '소득세'
);

-- 모든 직원에게 지방세 (0.3%) 공제 항목 추가
INSERT INTO salary_deductions (user_id, name, amount, type, is_active, created_at)
SELECT 
    id as user_id,
    '지방세' as name,
    0.3 as amount,
    'percentage' as type,
    true as is_active,
    NOW() as created_at
FROM profiles 
WHERE role IN ('employee', 'admin', 'super')
AND id NOT IN (
    SELECT user_id 
    FROM salary_deductions 
    WHERE name = '지방세'
);

-- 새로 가입하는 직원에게 자동으로 기본 세금 항목을 추가하는 함수
CREATE OR REPLACE FUNCTION add_default_tax_deductions()
RETURNS TRIGGER AS $$
BEGIN
    -- 소득세 추가
    INSERT INTO salary_deductions (user_id, name, amount, type, is_active, created_at)
    VALUES (NEW.id, '소득세', 3, 'percentage', true, NOW());
    
    -- 지방세 추가
    INSERT INTO salary_deductions (user_id, name, amount, type, is_active, created_at)
    VALUES (NEW.id, '지방세', 0.3, 'percentage', true, NOW());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 새 직원이 추가될 때 자동으로 기본 세금 항목을 추가하는 트리거
DROP TRIGGER IF EXISTS trigger_add_default_tax_deductions ON profiles;
CREATE TRIGGER trigger_add_default_tax_deductions
    AFTER INSERT ON profiles
    FOR EACH ROW
    WHEN (NEW.role IN ('employee', 'admin', 'super'))
    EXECUTE FUNCTION add_default_tax_deductions();