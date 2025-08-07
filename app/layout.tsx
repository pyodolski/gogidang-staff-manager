import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: '직원관리 프로그램',
  description: 'Next.js + Supabase 직원관리 시스템',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
