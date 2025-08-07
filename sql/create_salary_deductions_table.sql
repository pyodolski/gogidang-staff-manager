-- 급여 공제 항목 테이블 생성
CREATE TABLE public.salary_deductions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('fixed', 'percentage')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Seoul'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('Asia/Seoul'::text, now()),
    
    -- 외래키 제약조건
    CONSTRAINT salary_deductions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_salary_deductions_user_id ON public.salary_deductions(user_id);
CREATE INDEX idx_salary_deductions_is_active ON public.salary_deductions(is_active);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE public.salary_deductions ENABLE ROW LEVEL SECURITY;

-- 관리자만 모든 데이터에 접근 가능
CREATE POLICY "Admin can manage all salary deductions" ON public.salary_deductions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 직원은 자신의 공제 항목만 조회 가능
CREATE POLICY "Employees can view own salary deductions" ON public.salary_deductions
    FOR SELECT USING (user_id = auth.uid());

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('Asia/Seoul'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_salary_deductions_updated_at 
    BEFORE UPDATE ON public.salary_deductions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();