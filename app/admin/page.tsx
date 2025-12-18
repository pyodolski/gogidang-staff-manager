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
import EmployeeStatusModal from "../../components/EmployeeStatusModal";
import dayjs from "dayjs";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "approval" | "employees" | "diary"
  >("dashboard");
  const [showAnnouncementManager, setShowAnnouncementManager] = useState(false);
  const [showEmployeeStatusModal, setShowEmployeeStatusModal] = useState(false);
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile) {
        router.replace("/dashboard");
        return;
      }

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

    const { data: employees } = await supabase
      .from("profiles")
      .select("id, hourly_wage")
      .eq("role", "employee")
      .eq("is_hidden", false);

    const { data: pending } = await supabase
      .from("work_logs")
      .select("id")
      .eq("status", "pending");

    const { data: approvedLogs } = await supabase
      .from("work_logs")
      .select("user_id, clock_in, clock_out, work_type")
      .eq("status", "approved")
      .gte("date", startDate)
      .lte("date", endDate);

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
            <div className="space-y-4">
              {/* 빠른 액션 - 상단으로 이동, 작게 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => setActiveTab("approval")}
                  className="flex flex-col items-center gap-2 p-3 bg-white/80 backdrop-blur-sm hover:bg-white rounded-xl transition-all hover:scale-105 border border-blue-100 shadow-sm"
                >
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-2 rounded-lg">
                    <svg
                      className="w-4 h-4"
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
                  <span className="text-xs font-medium text-gray-700">
                    근무 승인
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("employees")}
                  className="flex flex-col items-center gap-2 p-3 bg-white/80 backdrop-blur-sm hover:bg-white rounded-xl transition-all hover:scale-105 border border-purple-100 shadow-sm"
                >
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-2 rounded-lg">
                    <svg
                      className="w-4 h-4"
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
                  <span className="text-xs font-medium text-gray-700">
                    직원 관리
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("diary")}
                  className="flex flex-col items-center gap-2 p-3 bg-white/80 backdrop-blur-sm hover:bg-white rounded-xl transition-all hover:scale-105 border border-amber-100 shadow-sm"
                >
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white p-2 rounded-lg">
                    <svg
                      className="w-4 h-4"
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
                  <span className="text-xs font-medium text-gray-700">
                    다이어리
                  </span>
                </button>

                <button
                  onClick={() => setShowAnnouncementManager(true)}
                  className="flex flex-col items-center gap-2 p-3 bg-white/80 backdrop-blur-sm hover:bg-white rounded-xl transition-all hover:scale-105 border border-green-100 shadow-sm"
                >
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-2 rounded-lg">
                    <svg
                      className="w-4 h-4"
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
                  <span className="text-xs font-medium text-gray-700">
                    공지사항
                  </span>
                </button>
              </div>

              {/* 통계 카드 - 작게 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => setShowEmployeeStatusModal(true)}
                  className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md hover:shadow-lg transition-all hover:scale-105 text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                      <svg
                        className="w-4 h-4"
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
                    <svg
                      className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold mb-0.5">
                    {stats.totalEmployees}명
                  </div>
                  <div className="text-blue-100 text-xs font-medium">
                    전체 직원 • 클릭하여 상태 확인
                  </div>
                </button>

                <div className="group bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-md hover:shadow-lg transition-all hover:scale-105">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                      <svg
                        className="w-4 h-4"
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
                  <div className="text-2xl font-bold mb-0.5">
                    {stats.pendingApprovals}건
                  </div>
                  <div className="text-orange-100 text-xs font-medium">
                    승인 대기
                  </div>
                </div>

                <div className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md hover:shadow-lg transition-all hover:scale-105">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                      <svg
                        className="w-4 h-4"
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
                  <div className="text-2xl font-bold mb-0.5">
                    {stats.monthlyTotalHours}h
                  </div>
                  <div className="text-purple-100 text-xs font-medium">
                    이번 달 총 근무시간
                  </div>
                </div>

                <div className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-md hover:shadow-lg transition-all hover:scale-105">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                      <svg
                        className="w-4 h-4"
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
                  <div className="text-2xl font-bold mb-0.5">
                    {(stats.monthlyTotalPay / 10000).toFixed(0)}만
                  </div>
                  <div className="text-green-100 text-xs font-medium">
                    이번 달 총 급여
                  </div>
                </div>
              </div>

              {/* 이번 달 현황 - 작게, 하단으로 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-blue-100 shadow-sm">
                  <div className="text-xs text-blue-600 font-medium mb-1">
                    평균 근무시간
                  </div>
                  <div className="text-xl font-bold text-blue-700">
                    {stats.totalEmployees > 0
                      ? (
                          stats.monthlyTotalHours / stats.totalEmployees
                        ).toFixed(1)
                      : 0}
                    h
                  </div>
                  <div className="text-xs text-blue-500 mt-0.5">직원 1인당</div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-purple-100 shadow-sm">
                  <div className="text-xs text-purple-600 font-medium mb-1">
                    평균 급여
                  </div>
                  <div className="text-xl font-bold text-purple-700">
                    {stats.totalEmployees > 0
                      ? (
                          stats.monthlyTotalPay /
                          stats.totalEmployees /
                          10000
                        ).toFixed(0)
                      : 0}
                    만원
                  </div>
                  <div className="text-xs text-purple-500 mt-0.5">
                    직원 1인당
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-green-100 shadow-sm">
                  <div className="text-xs text-green-600 font-medium mb-1">
                    승인율
                  </div>
                  <div className="text-xl font-bold text-green-700">
                    {stats.pendingApprovals > 0 ? "처리중" : "100%"}
                  </div>
                  <div className="text-xs text-green-500 mt-0.5">
                    {stats.pendingApprovals > 0
                      ? `${stats.pendingApprovals}건 대기`
                      : "모두 처리됨"}
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
              setAnnouncementRefreshTrigger((prev) => prev + 1);
            }}
          />
        )}

        {/* 직원 상태 모달 */}
        {showEmployeeStatusModal && (
          <EmployeeStatusModal
            onClose={() => setShowEmployeeStatusModal(false)}
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
