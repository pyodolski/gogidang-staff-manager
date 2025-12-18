"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AuthButton from "../../components/AuthButton";
import PendingWorkApproval from "../../components/PendingWorkApproval";
import EmployeeManagement from "../../components/EmployeeManagement";
import AnnouncementBanner from "../../components/AnnouncementBanner";
import AnnouncementManager from "../../components/AnnouncementManager";
import AdminDiary from "../../components/AdminDiary";
import dayjs from "dayjs";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "approval" | "employees" | "diary"
  >("dashboard");
  const [showAnnouncementManager, setShowAnnouncementManager] = useState(false);
  const [announcementRefreshTrigger, setAnnouncementRefreshTrigger] =
    useState(0);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingApprovals: 0,
    monthlyTotalPay: 0,
    monthlyTotalHours: 0,
  });
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
      loadStats();
    };

    checkAdmin();
  }, [router]);

  const loadStats = async () => {
    const supabase = createClient();
    const currentMonth = dayjs().format("YYYY-MM");
    const startDate = dayjs(currentMonth + "-01")
      .startOf("month")
      .format("YYYY-MM-DD");
    const endDate = dayjs(currentMonth + "-01")
      .endOf("month")
      .format("YYYY-MM-DD");

    // 전체 직원 수
    const { data: employees } = await supabase
      .from("profiles")
      .select("id, hourly_wage")
      .eq("role", "employee")
      .eq("is_hidden", false);

    // 승인 대기 중인 근무
    const { data: pending } = await supabase
      .from("work_logs")
      .select("id")
      .eq("status", "pending");

    // 이번 달 승인된 근무 기록
    const { data: approvedLogs } = await supabase
      .from("work_logs")
      .select("user_id, clock_in, clock_out, work_type")
      .eq("status", "approved")
      .gte("date", startDate)
      .lte("date", endDate);

    // 총 근무시간 및 급여 계산
    let totalHours = 0;
    let totalPay = 0;

    if (approvedLogs && employees) {
      const employeeMap = new Map(
        employees.map((e) => [e.id, e.hourly_wage || 0])
      );

      approvedLogs.forEach((log: any) => {
        if (log.work_type === "day_off" || !log.clock_in || !log.clock_out)
          return;

        const clockIn = dayjs(`2000-01-01 ${log.clock_in}`);
        let clockOut = dayjs(`2000-01-01 ${log.clock_out}`);

        if (clockOut.isBefore(clockIn)) {
          clockOut = clockOut.add(1, "day");
        }

        const hours = clockOut.diff(clockIn, "hour", true);
        const wage = employeeMap.get(log.user_id) || 0;

        totalHours += hours;
        totalPay += hours * wage;
      });
    }

    setStats({
      totalEmployees: employees?.length || 0,
      pendingApprovals: pending?.length || 0,
      monthlyTotalPay: Math.round(totalPay),
      monthlyTotalHours: Math.round(totalHours * 10) / 10,
    });
  };

  const tabs = [
    {
      id: "dashboard",
      name: "대시보드",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      id: "approval",
      name: "승인 관리",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: "employees",
      name: "직원 관리",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      id: "diary",
      name: "다이어리",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <main className="max-w-6xl mx-auto py-4 px-4">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
              관리자 대시보드
            </h1>
            <p className="text-gray-600 text-sm md:text-base">
              직원들의 근무를 관리하고 급여를 계산하세요
            </p>
          </div>
          <AuthButton />
        </div>

        {/* 공지사항 배너 */}
        <AnnouncementBanner
          isAdmin={true}
          onManageClick={() => setShowAnnouncementManager(true)}
          refreshTrigger={announcementRefreshTrigger}
        />

        {/* 탭 네비게이션 - 데스크톱 */}
        <div className="hidden md:block bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 mb-6 overflow-hidden">
          <div className="flex p-2 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-xl transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 모바일 탭 네비게이션 - 하단 고정 */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-50 safe-area-pb shadow-2xl">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-all ${
                  activeTab === tab.id ? "text-indigo-600" : "text-gray-500"
                }`}
              >
                <div
                  className={`p-2 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white scale-110"
                      : "bg-transparent"
                  }`}
                >
                  {tab.icon}
                </div>
                <span className="mt-1 text-[10px]">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="min-h-[400px] pb-20 md:pb-0">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* 통계 카드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 전체 직원 */}
                <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {stats.totalEmployees}명
                  </div>
                  <div className="text-blue-100 text-sm font-medium">
                    전체 직원
                  </div>
                </div>

                {/* 승인 대기 */}
                <div className="group bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {stats.pendingApprovals}건
                  </div>
                  <div className="text-orange-100 text-sm font-medium">
                    승인 대기
                  </div>
                </div>

                {/* 이번 달 총 근무시간 */}
                <div className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {stats.monthlyTotalHours}h
                  </div>
                  <div className="text-purple-100 text-sm font-medium">
                    이번 달 총 근무시간
                  </div>
                </div>

                {/* 이번 달 총 급여 */}
                <div className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {(stats.monthlyTotalPay / 10000).toFixed(0)}만
                  </div>
                  <div className="text-green-100 text-sm font-medium">
                    이번 달 총 급여
                  </div>
                </div>
              </div>

              {/* 빠른 액션 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  빠른 액션
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => setActiveTab("approval")}
                    className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all hover:scale-105 border border-blue-100"
                  >
                    <div className="bg-blue-500 text-white p-3 rounded-xl">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      근무 승인
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("employees")}
                    className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl transition-all hover:scale-105 border border-purple-100"
                  >
                    <div className="bg-purple-500 text-white p-3 rounded-xl">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      직원 관리
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("diary")}
                    className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-xl transition-all hover:scale-105 border border-amber-100"
                  >
                    <div className="bg-amber-500 text-white p-3 rounded-xl">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      다이어리
                    </span>
                  </button>

                  <button
                    onClick={() => setShowAnnouncementManager(true)}
                    className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all hover:scale-105 border border-green-100"
                  >
                    <div className="bg-green-500 text-white p-3 rounded-xl">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      공지사항
                    </span>
                  </button>
                </div>
              </div>

              {/* 최근 활동 요약 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  이번 달 현황
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="text-sm text-blue-600 font-medium mb-1">
                      평균 근무시간
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {stats.totalEmployees > 0
                        ? (
                            stats.monthlyTotalHours / stats.totalEmployees
                          ).toFixed(1)
                        : 0}
                      h
                    </div>
                    <div className="text-xs text-blue-500 mt-1">직원 1인당</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="text-sm text-purple-600 font-medium mb-1">
                      평균 급여
                    </div>
                    <div className="text-2xl font-bold text-purple-700">
                      {stats.totalEmployees > 0
                        ? (
                            stats.monthlyTotalPay /
                            stats.totalEmployees /
                            10000
                          ).toFixed(0)
                        : 0}
                      만원
                    </div>
                    <div className="text-xs text-purple-500 mt-1">
                      직원 1인당
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="text-sm text-green-600 font-medium mb-1">
                      승인율
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      {stats.pendingApprovals > 0 ? "처리중" : "100%"}
                    </div>
                    <div className="text-xs text-green-500 mt-1">
                      {stats.pendingApprovals > 0
                        ? `${stats.pendingApprovals}건 대기`
                        : "모두 처리됨"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "approval" && <PendingWorkApproval />}
          {activeTab === "employees" && <EmployeeManagement />}
          {activeTab === "diary" && <AdminDiary />}
        </div>

        {/* 공지사항 관리 모달 */}
        {showAnnouncementManager && (
          <AnnouncementManager
            onClose={() => setShowAnnouncementManager(false)}
            onAnnouncementChange={() => {
              // 공지사항 변경 시 새로고침 트리거
              setAnnouncementRefreshTrigger((prev) => prev + 1);
            }}
          />
        )}

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
