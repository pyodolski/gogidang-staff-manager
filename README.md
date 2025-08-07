# 고기당 직원 관리 시스템

Next.js와 Supabase를 활용한 현대적인 직원 근무 관리 및 급여 계산 시스템입니다.

## 🚀 주요 기능

### 👥 직원 기능

- **Google OAuth 로그인**: 간편하고 안전한 소셜 로그인
- **근무 등록**: 출근/퇴근 시간 기록 및 관리
- **근무 캘린더**: 월별 근무 일정 시각화
- **급여 요약**: 실시간 급여 계산 및 세부 내역 확인
- **근무 내역 조회**: 승인 대기/승인 완료 상태별 근무 기록 관리

### 👨‍💼 관리자 기능

- **근무 승인 관리**: 직원들의 근무 기록 승인/반려 처리
- **직원 관리**: 직원 정보 수정, 시급 설정, 공제 항목 관리
- **급여 명세서**: 월별 급여 명세서 생성 및 인쇄
- **대시보드**: 전체 직원 근무 현황 모니터링

## 🛠 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **배포**: Vercel
- **기타**: Day.js, React Calendar, React PDF

## 📋 시스템 구조

### 데이터베이스 스키마

- **profiles**: 사용자 프로필 (역할, 시급 등)
- **work_logs**: 근무 기록 (출근/퇴근 시간, 승인 상태)
- **salary_deductions**: 급여 공제 항목 (고정액/비율)

### 주요 컴포넌트

- **AuthButton**: 인증 상태 관리 및 로그인/로그아웃
- **WorkSummary**: 월별 급여 요약 및 계산
- **WorkCalendar**: 근무 일정 캘린더 뷰
- **EmployeeManagement**: 직원 정보 및 공제 항목 관리
- **PayrollSlip**: 급여 명세서 생성 및 인쇄
- **PendingWorkApproval**: 근무 승인 관리

## 🔧 설치 및 실행

### 1. 프로젝트 클론

```bash
git clone <repository-url>
cd employee-management
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Supabase 설정

#### 데이터베이스 테이블 생성

```sql
-- profiles 테이블 (Supabase Auth와 연동)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'employee',
  hourly_wage INTEGER DEFAULT 10000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- work_logs 테이블
CREATE TABLE work_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TEXT NOT NULL,
  clock_out TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- salary_deductions 테이블
CREATE TABLE salary_deductions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT CHECK (type IN ('fixed', 'percentage')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### RLS (Row Level Security) 정책 설정

```sql
-- profiles 테이블 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- work_logs, salary_deductions 테이블도 유사하게 설정
```

#### Google OAuth 설정

1. Supabase 대시보드 → Authentication → Providers
2. Google 활성화 및 클라이언트 ID/Secret 설정
3. Redirect URLs에 다음 추가:
   - `http://localhost:3000/auth/callback` (개발용)
   - `https://your-domain.vercel.app/auth/callback` (배포용)

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하세요.

## 📱 사용법

### 직원 사용자

1. Google 계정으로 로그인
2. 대시보드에서 "근무 등록" 버튼 클릭
3. 출근/퇴근 시간 입력 후 저장
4. 급여 요약에서 월별 급여 확인
5. 근무 내역에서 승인 상태 확인

### 관리자

1. 관리자 권한으로 로그인 (DB에서 role을 'admin'으로 설정)
2. 승인 관리 탭에서 직원들의 근무 기록 승인/반려
3. 직원 관리 탭에서 직원 정보 수정 및 공제 항목 관리
4. 급여 명세서 생성 및 인쇄

## 💰 급여 계산 로직

### 기본 계산

- **총 급여** = 총 근무시간 × 시급
- **소득세** = 총 급여 × 3%
- **지방세** = 총 급여 × 0.3%
- **기타 공제** = 고정액 + (총 급여 × 비율)
- **실지급액** = 총 급여 - (소득세 + 지방세 + 기타 공제)

### 공제 항목 관리

- **고정액 공제**: 매월 일정 금액 공제
- **비율 공제**: 총 급여의 일정 비율 공제
- 관리자가 직원별로 개별 설정 가능

## 🔐 보안 기능

- **Row Level Security (RLS)**: 데이터베이스 레벨에서 접근 권한 제어
- **역할 기반 접근 제어**: 직원/관리자 권한 분리
- **Google OAuth**: 안전한 소셜 로그인
- **실시간 인증 상태 관리**: 자동 로그인/로그아웃 처리

## 📱 반응형 디자인

- **모바일 우선**: 모바일 환경에 최적화된 UI/UX
- **태블릿/데스크톱 지원**: 다양한 화면 크기 대응
- **하단 네비게이션**: 모바일에서 편리한 탭 네비게이션
- **인쇄 최적화**: 급여 명세서 인쇄 시 깔끔한 레이아웃

## 🚀 배포

### Vercel 배포

1. GitHub에 코드 푸시
2. Vercel에서 프로젝트 연결
3. 환경 변수 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 자동 배포 완료

### 환경 변수 주의사항

- Vercel 환경 변수에서 URL이 올바르게 설정되었는지 확인
- `https://` 프로토콜이 정확히 포함되어야 함

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트에 대한 문의사항이나 버그 리포트는 GitHub Issues를 통해 남겨주세요.

---
