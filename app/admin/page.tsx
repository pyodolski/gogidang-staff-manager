"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AuthButton from "../../components/AuthButton";
import PendingWorkApproval from "../../components/PendingWorkApproval";
import EmployeeManagement from "../../components/EmployeeManagement";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"approval" | "employees">(
    "approval"
  );
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // 관리자 권한 확인
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile) {
        router.replace("/dashboard");
        return;
      }

      // Super는 super 페이지로, employee는 dashboard로
      if (profile.role === "super") {
        router.replace("/super");
        return;
      } else if (profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const tabs = [
    {
      id: "approval",
      name: "승인 관리",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      ),
    },
    {
      id: "employees",
      name: "직원 관리",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.5 7H17c-.8 0-1.5.7-1.5 1.5v6c0 .8.7 1.5 1.5 1.5h1v6h2zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zm1.5 1h-3C9.57 12.5 8.5 13.57 8.5 15v7h8v-7c0-1.43-1.07-2.5-2.5-2.5zM5.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm2 16v-7H9v-2.5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2V15h1.5v7h4z" />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <div className="text-gray-600 font-medium">
              권한을 확인하고 있습니다...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <main className="max-w-4xl mx-auto py-4 px-4">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
              관리자 대시보드
            </h1>
            <p className="text-gray-600 text-sm md:text-base">
              직원들의 근무를 관리하고 급여를 계산하세요
            </p>
          </div>
          <AuthButton />
        </div>

        {/* 관리자 환영 카드 */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-full p-3">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                <path
                  d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"
                  fill="white"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">환영합니다, 관리자님!</h2>
              <p className="text-purple-100">
                직원들의 근무 승인과 급여 관리를 효율적으로 처리하세요
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
                    ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                } ${tab.id === "approval" ? "rounded-tl-xl" : ""} ${
                  tab.id === "employees" ? "rounded-tr-xl" : ""
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
                    ? "text-purple-600 bg-purple-50"
                    : "text-gray-600"
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    activeTab === tab.id ? "bg-purple-100" : ""
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
          {activeTab === "approval" && <PendingWorkApproval />}
          {activeTab === "employees" && <EmployeeManagement />}
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
