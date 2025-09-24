-- 공지사항 테이블 생성
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1, -- 1: 일반, 2: 중요, 3: 긴급
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 공지사항 읽음 상태 테이블 생성
CREATE TABLE announcement_reads (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 공지사항을 읽을 수 있음
CREATE POLICY "Anyone can read announcements" ON announcements
  FOR SELECT USING (true);

-- 관리자만 공지사항을 생성/수정/삭제할 수 있음
CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super')
    )
  );

-- 사용자는 자신의 읽음 상태만 관리할 수 있음
CREATE POLICY "Users can manage their own reads" ON announcement_reads
  FOR ALL USING (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX idx_announcements_active ON announcements(is_active, created_at DESC);
CREATE INDEX idx_announcements_priority ON announcements(priority, created_at DESC);
CREATE INDEX idx_announcement_reads_user ON announcement_reads(user_id, announcement_id);