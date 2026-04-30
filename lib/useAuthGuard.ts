"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./supabase/client";

/**
 * 세션 만료/로그아웃 이벤트를 감지해서 로그인 페이지로 리디렉션.
 * 각 페이지 최상단에서 한 번만 호출하면 됨.
 */
export function useAuthGuard() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // 현재 세션 즉시 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      }
    });

    // 세션 변경 실시간 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        router.replace("/login");
      }
      // 토큰 자동 갱신 성공 — 별도 처리 불필요 (supabase-js가 자동 처리)
    });

    return () => subscription.unsubscribe();
  }, [router]);
}
