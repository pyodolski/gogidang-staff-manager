"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";
import EmployeeDetail from "./EmployeeDetail";
import PayrollSlip from "./PayrollSlip";
import { calculateWorkHours } from "../lib/timeUtils";

type Employee = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  hourly_wage: number;
  created_at: string;
};

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [editingWage, setEditingWage] = useState<{
    id: string;
    wage: string;
  } | null>(null);
  const [payrollEmployee, setPayrollEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "wage" | "hours">("name");
  const [showScrollTop, setShowScrollTop] = useState(false);

  const fetchEmployees = async () => {
    const supabase = createClient();
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "employee")
      .eq("is_hidden", false) // 숨겨지지 않은 직원만 조회
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching employees:", error);
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const updateHourlyWage = async (employeeId: string, newWage: number) => {
    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({ hourly_wage: newWage })
      .eq("id", employeeId);

    if (error) {
      alert("시급 업데이트 실패: " + error.message);
    } else {
      fetchEmployees();
      setEditingWage(null);
    }
  };

  const handleWageEdit = (employeeId: string, currentWage: number) => {
    setEditingWage({ id: employeeId, wage: currentWage.toString() });
  };

  const handleWageSave = (employeeId: string) => {
    if (!editingWage) return;

    const newWage = parseInt(editingWage.wage);
    if (isNaN(newWage) || newWage < 0) {
      alert("올바른 시급을 입력해주세요.");
      return;
    }

    updateHourlyWage(employeeId, newWage);
  };

  const handleWageCancel = () => {
    setEditingWage(null);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 맨 위로 스크롤
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 검색 및 정렬된 직원 목록
  const getFilteredAndSortedEmployees = () => {
    let filtered = employees.filter(
      (emp) =>
        emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 정렬
    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return (a.full_name || "").localeCompare(b.full_name || "");
      } else if (sortBy === "wage") {
        return (b.hourly_wage || 0) - (a.hourly_wage || 0);
      } else if (sortBy === "hours") {
        const aHours = monthlyStats[a.id]?.totalHours || 0;
        const bHours = monthlyStats[b.id]?.totalHours || 0;
        return bHours - aHours;
      }
      return 0;
    });

    return filtered;
  };

  const calculateMonthlyStats = async (employeeId: string, month: string) => {
    const supabase = createClient();

    const startDate = dayjs(month + "-01")
      .startOf("month")
      .format("YYYY-MM-DD");
    const endDate = dayjs(month + "-01")
      .endOf("month")
      .format("YYYY-MM-DD");

    const { data: logs } = await supabase
      .from("work_logs")
      .select("*")
      .eq("user_id", employeeId)
      .eq("status", "approved")
      .gte("date", startDate)
      .lte("date", endDate);

    let totalHours = 0;
    logs?.forEach((log: any) => {
      // 휴무인 경우 시간 계산하지 않음
      if (log.work_type === "day_off" || !log.clock_in || !log.clock_out) {
        return;
      }

      // timeUtils의 공통 함수 사용 (야간 근무 처리 포함)
      const hours = calculateWorkHours(
        log.clock_in,
        log.clock_out,
        log.work_type
      );
      totalHours += hours;
    });
    return {
      totalHours,
      workDays: logs?.length || 0,
    };
  };

  const [monthlyStats, setMonthlyStats] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const loadStats = async () => {
      const stats: { [key: string]: any } = {};
      for (const employee of employees) {
        stats[employee.id] = await calculateMonthlyStats(
          employee.id,
          selectedMonth
        );
      }
      setMonthlyStats(stats);
    };

    if (employees.length > 0) {
      loadStats();
    }
  }, [employees, selectedMonth]);

  if (selectedEmployee) {
    return (
      <EmployeeDetail
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
        onUpdate={fetchEmployees}
      />
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredEmployees = getFilteredAndSortedEmployees();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 rounded-full p-2">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">직원 관리</h2>
            <p className="text-sm text-gray-600">
              총 {employees.length}명{" "}
              {searchQuery && `(검색: ${filteredEmployees.length}명)`}
            </p>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 검색 */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="직원 이름 또는 이메일 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* 정렬 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">이름순</option>
            <option value="wage">시급순</option>
            <option value="hours">근무시간순</option>
          </select>

          {/* 조회 월 */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 전체 시급 설정 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">
            전체 시급:
          </label>
          <button
            onClick={() => {
              if (
                confirm("모든 직원의 시급을 10,030원으로 설정하시겠습니까?")
              ) {
                employees.forEach((emp) => updateHourlyWage(emp.id, 10030));
              }
            }}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            10,030원 설정
          </button>
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500 font-medium mb-2">
            {searchQuery ? "검색 결과가 없습니다" : "등록된 직원이 없습니다"}
          </p>
          <p className="text-gray-400 text-sm">
            {searchQuery
              ? "다른 검색어를 입력해보세요"
              : "새로운 직원이 가입하면 여기에 표시됩니다."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEmployees.map((employee) => {
            const stats = monthlyStats[employee.id] || {
              totalHours: 0,
              workDays: 0,
            };
            const expectedPay = stats.totalHours * employee.hourly_wage;

            return (
              <div
                key={employee.id}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                {/* 직원 정보 헤더 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 rounded-full p-2">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">
                      {employee.full_name || "이름 없음"}
                    </h3>
                    <p className="text-sm text-gray-600">{employee.email}</p>
                  </div>
                </div>

                {/* 시급 정보 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">시급</span>
                    {editingWage?.id === employee.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editingWage.wage}
                          onChange={(e) =>
                            setEditingWage({
                              ...editingWage,
                              wage: e.target.value,
                            })
                          }
                          className="w-24 px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") handleWageSave(employee.id);
                            if (e.key === "Escape") handleWageCancel();
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleWageSave(employee.id)}
                          className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={handleWageCancel}
                          className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-blue-600">
                          {employee.hourly_wage?.toLocaleString() || "0"}원
                        </span>
                        <button
                          onClick={() =>
                            handleWageEdit(
                              employee.id,
                              employee.hourly_wage || 0
                            )
                          }
                          className="p-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 이번 달 통계 */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/50 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">근무시간</div>
                    <div className="font-semibold text-gray-800">
                      {stats.totalHours.toFixed(1)}시간
                    </div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">근무일수</div>
                    <div className="font-semibold text-gray-800">
                      {stats.workDays}일
                    </div>
                  </div>
                </div>

                {/* 예상 급여 */}
                <div className="bg-white/70 rounded-lg p-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">예상 급여</span>
                    <span className="font-bold text-green-600">
                      {expectedPay.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedEmployee(employee)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
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
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    상세보기
                  </button>
                  <button
                    onClick={() => setPayrollEmployee(employee)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    급여명세서
                  </button>
                </div>

                {/* 가입일 */}
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="text-xs text-gray-500">
                    가입일: {dayjs(employee.created_at).format("YYYY-MM-DD")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 급여 명세서 모달 */}
      {payrollEmployee && (
        <PayrollSlip
          employee={payrollEmployee}
          selectedMonth={selectedMonth}
          onClose={() => setPayrollEmployee(null)}
        />
      )}

      {/* 맨 위로 이동 버튼 */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all z-40 animate-bounce"
          title="맨 위로"
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
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
