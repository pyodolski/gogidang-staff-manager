-- 특정 사용자의 시급을 10,030원으로 업데이트
-- 본인의 이메일 주소로 변경해주세요
UPDATE public.profiles 
SET hourly_wage = 10030 
WHERE email = 'your-email@gmail.com';

-- 또는 모든 직원의 시급을 10,030원으로 업데이트
UPDATE public.profiles 
SET hourly_wage = 10030 
WHERE role = 'employee';

-- 업데이트 결과 확인
SELECT id, email, full_name, hourly_wage 
FROM public.profiles 
WHERE role = 'employee';