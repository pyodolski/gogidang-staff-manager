"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

type Employee = {
  id: string;
  full_name: string;
  email: string;
  hourly_wage: number;
  created_at: string;
};

type EmployeeWithStatus = Employee & {
  lastWorkDate: string | null;
  totalWorkDays: number;
  monthlyWorkDays: number;
  status: "active" | "inactive" | "new";
};

type Props = {
  onClose: () => void;
};

export default function EmployeeStatusModal({ onClose }: Props) {
  const [employees, setEmployees] = useState<EmployeeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "new">(
    "all"
  );

  useEffect(() => {
    fetchEmployeeStatus();
  }, []);

  const fetchEmployeeStatus = async () => {
    const supabase = createClient();
    setLoading(true);

    // 직원 목록 가져오기
    const { data: employeeData } = await supabase
      .from("profiles")
      .select("id, full_name, email, hourly_wage, created_at")
      .eq("role", "employee")
      .eq("is_hidden", false)
      .order("full_name");

    if (!employeeData) {
      setLoading(false);
      return;
    }

    // 이번 달 시작/종료일
    const currentMonth = dayjs().format("YYYY-MM");
    const startDate = dayjs(currentMonth + "-01")
      .startOf("month")
      .format("YYYY-MM-DD");
    const endDate = dayjs(currentMonth + "-01")
      .endOf("month")
      .format("YYYY-MM-DD");

    // 각 직원의 근무 기록 가져오기
    const employeesWithStatus = await Promise.all(
      employeeData.map(async (employee) => {
        // 전체 근무 기록
        const { data: allLogs } = await supabase
          .from("work_logs")
          .select("date")
          .eq("user_id", employee.id)
          .eq("status", "approved")
          .order("date", { ascending: false });

        // 이번 달 근무 기록
        const { data: monthlyLogs } = await supabase
          .from("work_logs")
          .select("date")
          .eq("user_id", employee.id)
          .eq("status", "approved")
          .gte("date", startDate)
          .lte("date", endDate);

        const lastWorkDate =
          allLogs && allLogs.length > 0 ? allLogs[0].date : null;
        const totalWorkDays = allLogs?.length || 0;
        const monthlyWorkDays = monthlyLogs?.length || 0;

        // 상태 판단
        let status: "active" | "inactive" | "new" = "new";

        if (totalWorkDays === 0) {
          // 근무 기록이 없으면 신규
          status = "new";
        } else if (lastWorkDate) {
          const daysSinceLastWork = dayjs().diff(dayjs(lastWorkDate), "day");
          // 7일 이내 근무했으면 활성, 아니면 비활성
          status = daysSinceLastWork <= 7 ? "active" : "inactive";
        }

        return {
          ...employee,
          lastWorkDate,
          totalWorkDays,
          monthlyWorkDays,
          status,
        };
      })
    );

    setEmployees(employeesWithStatus);
    setLoading(false);
  };

  const filteredEmployees =
    filter === "all"
      ? employees
      : employees.filter((emp) => emp.status === filter);

  const statusCounts = {
    all: employees.length,
    active: employees.filter((e) => e.status === "active").length,
    inactive: employees.filter((e) => e.status === "inactive").length,
    new: employees.filter((e) => e.status === "new").length,
  };

  const getStatusBadge = (status: "active" | "inactive" | "new") => {
    switch (status) {
      case "active":
        return (
          <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs rounded-lg font-semibold shadow-md">
            활성
          </span>
        );
      case "inactive":
        return (
          <span className="px-3 py-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-xs rounded-lg font-semibold shadow-md">
            비활성
          </span>
        );
      case "new":
        return (
          <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-xs rounded-lg font-semibold shadow-md">
            신규
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6">
          <div className="flex justify-between items-start">
            <div className="text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 rounded-lg p-2">
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
                <h3 className="text-2xl font-bold">직원 상태</h3>
              </div>
              <p className="text-blue-100 text-sm">
                전체 {employees.length}명의 직원 근무 상태를 확인하세요
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 필터 버튼 */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                filter === "all"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              전체 ({statusCounts.all})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                filter === "active"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-105"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              활성 ({statusCounts.active})
            </button>
            <button
              onClick={() => setFilter("inactive")}
              className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                filter === "inactive"
                  ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg scale-105"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              비활성 ({statusCounts.inactive})
            </button>
            <button
              onClick={() => setFilter("new")}
              className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                filter === "new"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg scale-105"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              신규 ({statusCounts.new})
            </button>
          </div>
        </div>

        {/* 직원 목록 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <p className="text-gray-600 font-semibold text-lg mb-2">
                해당하는 직원이 없습니다
              </p>
              <p className="text-gray-500 text-sm">다른 필터를 선택해보세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-white/50 p-4 hover:shadow-xl hover:scale-[1.02] transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-gray-800">
                          {employee.full_name}
                        </h4>
                        {getStatusBadge(employee.status)}
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
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
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        {employee.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center gap-2 mb-1">
                        <svg
                          className="w-4 h-4 text-amber-600"
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
                        <span className="text-xs text-gray-600 font-medium">
                          시급
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">
                        {employee.hourly_wage.toLocaleString()}원
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center gap-2 mb-1">
                        <svg
                          className="w-4 h-4 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-xs text-gray-600 font-medium">
                          이번 달
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">
                        {employee.monthlyWorkDays}일
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
                      <div className="flex items-center gap-2 mb-1">
                        <svg
                          className="w-4 h-4 text-purple-600"
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
                        <span className="text-xs text-gray-600 font-medium">
                          총 근무
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">
                        {employee.totalWorkDays}일
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                      <div className="flex items-center gap-2 mb-1">
                        <svg
                          className="w-4 h-4 text-green-600"
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
                        <span className="text-xs text-gray-600 font-medium">
                          최근 근무
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">
                        {employee.lastWorkDate
                          ? dayjs(employee.lastWorkDate).format("MM/DD")
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg font-semibold transition-all hover:scale-105"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
