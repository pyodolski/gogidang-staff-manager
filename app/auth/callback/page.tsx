'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient();
      
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.replace('/login?error=auth_failed');
          return;
        }

        if (data.session) {
          // 프로필 확인 및 생성
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.session.user.id)
            .single();

          if (!profile && (profileError?.code === 'PGRST116' || !profileError)) {
            // 프로필이 없으면 생성
            console.log('Creating profile for new user:', data.session.user.id);
            await supabase
              .from('profiles')
              .insert({
                id: data.session.user.id,
                email: data.session.user.email,
                full_name: data.session.user.user_metadata?.full_name || data.session.user.email,
                role: 'employee',
                hourly_wage: 10000
              });
          }

          // 세션이 있으면 루트로 이동 (루트에서 역할에 따라 리디렉션)
          router.replace('/');
        } else {
          // 세션이 없으면 로그인 페이지로
          router.replace('/login');
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        router.replace('/login?error=unexpected');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-gray-600 font-medium">로그인 처리 중...</div>
    </div>
  );
}