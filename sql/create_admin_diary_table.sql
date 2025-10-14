-- 관리자 다이어리 테이블 생성
CREATE TABLE admin_diary (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  diary_date DATE NOT NULL,
  title VARCHAR(200),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id, diary_date) -- 한 관리자가 하루에 하나의 다이어리만 작성 가능
);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE admin_diary ENABLE ROW LEVEL SECURITY;

-- 모든 관리자가 다이어리를 읽고 쓸 수 있음 (공유 다이어리)
CREATE POLICY "Admins can read all diaries" ON admin_diary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super')
    )
  );

CREATE POLICY "Admins can create diaries" ON admin_diary
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super')
    )
  );

CREATE POLICY "Admins can update all diaries" ON admin_diary
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super')
    )
  );

CREATE POLICY "Admins can delete all diaries" ON admin_diary
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super')
    )
  );

-- 인덱스 생성
CREATE INDEX idx_admin_diary_date ON admin_diary(admin_id, diary_date DESC);
CREATE INDEX idx_admin_diary_created ON admin_diary(created_at DESC);

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_admin_diary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_diary_updated_at
  BEFORE UPDATE ON admin_diary
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_diary_updated_at();