"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AuthButton from "../../components/AuthButton";
import SuperEmployeeManagement from "../../components/SuperEmployeeManagement";
import PendingWorkApproval from "../../components/PendingWorkApproval";

export default function SuperPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"employees" | "approval">(
    "employees"
  );
  const router = useRouter();

  useEffect(() => {
    const checkSuper = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // Super 권한 확인
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "super") {
        // Super가 아니면 기존 로직으로 리디렉션
        if (profile?.role === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/dashboard");
        }
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkSuper();
  }, [router]);

  const tabs = [
    {
      id: "employees",
      name: "직원 관리",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          <path d="M18 12.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 1c-1.33 0-4 .67-4 2v1h8v-1c0-1.33-2.67-2-4-2z" />
        </svg>
      ),
    },
    {
      id: "approval",
      name: "승인 관리",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            <div className="text-gray-600 font-medium">
              권한을 확인하고 있습니다...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
      <main className="max-w-6xl mx-auto py-4 px-4">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
              슈퍼관리자 대시보드
            </h1>
            <p className="text-gray-600 text-sm md:text-base">
              모든 직원과 관리자를 관리하고 권한을 부여하세요
            </p>
          </div>
          <AuthButton />
        </div>

        {/* 슈퍼관리자 환영 카드 */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-full p-3">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">
                환영합니다, 슈퍼관리자님!
              </h2>
              <p className="text-red-100">
                모든 직원의 계정을 관리하고 권한을 부여할 수 있습니다
              </p>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 - 데스크톱 */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "text-red-600 border-b-2 border-red-600 bg-red-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                } ${tab.id === "employees" ? "rounded-tl-xl" : ""} ${
                  tab.id === "approval" ? "rounded-tr-xl" : ""
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 모바일 탭 네비게이션 - 하단 고정 */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center justify-center py-3 px-2 text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "text-red-600 bg-red-50"
                    : "text-gray-600"
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    activeTab === tab.id ? "bg-red-100" : ""
                  }`}
                >
                  {tab.icon}
                </div>
                <span className="mt-1">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="min-h-[400px] pb-20 md:pb-0">
          {activeTab === "employees" && <SuperEmployeeManagement />}
          {activeTab === "approval" && <PendingWorkApproval />}
        </div>

        {/* 모바일 전용 스타일 */}
        <style jsx>{`
          @media (max-width: 768px) {
            .safe-area-pb {
              padding-bottom: env(safe-area-inset-bottom);
            }
          }
        `}</style>
      </main>
    </div>
  );
}
