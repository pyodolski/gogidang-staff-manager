-- 기존에 자동으로 추가된 소득세와 지방세 공제 항목을 제거하는 스크립트
-- 관리자가 직접 설정하지 않은 기본 세금 항목들을 삭제합니다.

-- 모든 직원의 소득세 공제 항목 삭제
DELETE FROM salary_deductions 
WHERE name = '소득세';

-- 모든 직원의 지방세 공제 항목 삭제  
DELETE FROM salary_deductions 
WHERE name = '지방세';

-- 지방소득세 항목도 있다면 삭제
DELETE FROM salary_deductions 
WHERE name = '지방소득세';

-- 기존 트리거가 있다면 제거
DROP TRIGGER IF EXISTS trigger_add_default_tax_deductions ON profiles;
DROP FUNCTION IF EXISTS add_default_tax_deductions();

-- 확인용 쿼리 (실행 후 결과 확인)
SELECT 
    p.full_name,
    COUNT(sd.id) as deduction_count,
    STRING_AGG(sd.name, ', ') as deduction_names
FROM profiles p
LEFT JOIN salary_deductions sd ON p.id = sd.user_id AND sd.is_active = true
WHERE p.role IN ('employee', 'admin', 'super')
GROUP BY p.id, p.full_name
ORDER BY p.full_name;