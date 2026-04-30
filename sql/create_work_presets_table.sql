-- 근무 퀵등록 프리셋 테이블
CREATE TABLE IF NOT EXISTS work_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- 프리셋 이름 (예: "평일 오전", "주말 오후")
  clock_in TIME NOT NULL,       -- 출근 시간
  clock_out TIME NOT NULL,      -- 퇴근 시간
  days_of_week INTEGER[],       -- 적용 요일 [0=일,1=월,...,6=토] (선택사항, 표시용)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE work_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own presets" ON work_presets
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_work_presets_user_id ON work_presets(user_id);
