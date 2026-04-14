"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PendingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const isInactive = reason === "inactive";

  const [userName, setUserName] = useState("");

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, is_approved, is_hidden, role")
        .eq("id", user.id)
        .single();

      if (!profile) { router.replace("/login"); return; }

      // admin/super는 여기 올 필요 없음
      if (profile.role === "admin") { router.replace("/admin"); return; }
      if (profile.role === "super") { router.replace("/super"); return; }

      // 이미 승인됐고 활성 상태면 대시보드로
      if (profile.is_approved && !profile.is_hidden) {
        router.replace("/dashboard");
        return;
      }

      setUserName(profile.full_name || user.email || "");
    };
    check();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
        {isInactive ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">접근이 제한되었습니다</h1>
            <p className="text-sm text-gray-500 mb-6">
              계정이 비활성화 상태입니다.<br />관리자에게 문의해주세요.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">승인 대기 중</h1>
            <p className="text-sm text-gray-500 mb-1">
              {userName && <span className="font-semibold text-gray-700">{userName}</span>}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              관리자가 계정을 승인하면<br />서비스를 이용할 수 있습니다.
            </p>
          </>
        )}

        <button
          onClick={handleSignOut}
          className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
