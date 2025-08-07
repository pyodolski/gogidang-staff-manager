"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const checkUserAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // 프로필 조회
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            // PGRST116은 "no rows returned" 에러로, 프로필이 없다는 의미
            console.error('Profile fetch error:', error);
            router.replace('/dashboard');
            return;
          }

          if (profile) {
            if (profile.role === 'admin') {
              router.replace('/admin');
            } else {
              router.replace('/dashboard');
            }
          } else {
            // 프로필이 없으면 생성
            console.log('Creating profile for user:', session.user.id);
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || session.user.email,
                role: 'employee',
                hourly_wage: 10000
              });

            if (insertError) {
              console.error('Profile creation error:', insertError);
            } else {
              console.log('Profile created successfully');
            }
            
            // 프로필 생성 후 대시보드로
            router.replace('/dashboard');
          }
        } else {
          router.replace('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.replace('/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkUserAndRedirect();

    // Auth state 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      } else if (event === 'SIGNED_IN' && session) {
        // 로그인 시에만 리디렉션 로직 실행
        checkUserAndRedirect();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (isChecking) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600 font-medium">인증 상태를 확인하고 있습니다...</div>
      </main>
    );
  }

  return null;
}
