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
  is_hidden: boolean;
};

type EmployeeWithStatus = Employee & {
  lastWorkDate: string | null;
  totalWorkDays: number;
  monthlyWorkDays: number;
  status: "active" | "hidden" | "new";
};

type Props = {
  onClose: () => void;
  onUpdate?: () => void;
};

export default function EmployeeStatusModal({ onClose, onUpdate }: Props) {
  const [employees, setEmployees] = useState<EmployeeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "hidden" | "new">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployeeStatus();
  }, []);

  const fetchEmployeeStatus = async () => {
    const supabase = createClient();
    setLoading(true);

    const { data: employeeData } = await supabase
      .from("profiles")
      .select("id, full_name, email, hourly_wage, created_at, is_hidden")
      .eq("role", "employee")
      .order("full_name");

    if (!employeeData) {
      setLoading(false);
      return;
    }

    const currentMonth = dayjs().format("YYYY-MM");
    const startDate = dayjs(currentMonth + "-01").startOf("month").format("YYYY-MM-DD");
    const endDate = dayjs(currentMonth + "-01").endOf("month").format("YYYY-MM-DD");

    const employeesWithStatus = await Promise.all(
      employeeData.map(async (employee) => {
        const { data: allLogs } = await supabase
          .from("work_logs")
          .select("date")
          .eq("user_id", employee.id)
          .eq("status", "approved")
          .order("date", { ascending: false });

        const { data: monthlyLogs } = await supabase
          .from("work_logs")
          .select("date")
          .eq("user_id", employee.id)
          .eq("status", "approved")
          .gte("date", startDate)
          .lte("date", endDate);

        const lastWorkDate = allLogs && allLogs.length > 0 ? allLogs[0].date : null;
        const totalWorkDays = allLogs?.length || 0;
        const monthlyWorkDays = monthlyLogs?.length || 0;

        let status: "active" | "hidden" | "new" = "new";
        if (employee.is_hidden) {
          status = "hidden";
        } else if (totalWorkDays > 0) {
          status = "active";
        }

        return { ...employee, lastWorkDate, totalWorkDays, monthlyWorkDays, status };
      })
    );

    setEmployees(employeesWithStatus);
    setLoading(false);
  };

  const handleToggleHidden = async (employeeId: string, currentHidden: boolean) => {
    setTogglingId(employeeId);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_hidden: !currentHidden })
      .eq("id", employeeId);

    if (error) {
      alert("상태 변경 중 오류가 발생했습니다: " + error.message);
    } else {
      await fetchEmployeeStatus();
      onUpdate?.();
    }
    setTogglingId(null);
  };

  const filteredEmployees =
    filter === "all" ? employees : employees.filter((emp) => emp.status === filter);

  const statusCounts = {
    all: employees.length,
    active: employees.filter((e) => e.status === "active").length,
    hidden: employees.filter((e) => e.status === "hidden").length,
    new: employees.filter((e) => e.status === "new").length,
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">직원 상태 관리</h3>
            <p className="text-xs text-gray-500 mt-0.5">총 {employees.length}명</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-1.5 px-4 py-3 border-b border-gray-100 overflow-x-auto">
          {(["all", "active", "hidden", "new"] as const).map((f) => {
            const labels = { all: "전체", active: "활성", hidden: "비활성", new: "신규" };
            const colors = {
              all: filter === f ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600",
              active: filter === f ? "bg-green-500 text-white" : "bg-green-50 text-green-700",
              hidden: filter === f ? "bg-red-500 text-white" : "bg-red-50 text-red-700",
              new: filter === f ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-700",
            };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${colors[f]}`}
              >
                {labels[f]} {statusCounts[f]}
              </button>
            );
          })}
        </div>

        {/* 직원 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="space-y-2 pt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">해당하는 직원이 없습니다</p>
            </div>
          ) : (
            filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  employee.is_hidden
                    ? "bg-gray-50 border-gray-200"
                    : "bg-white border-gray-100"
                }`}
              >
                {/* 상태 인디케이터 */}
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  employee.is_hidden ? "bg-red-400" : "bg-green-400"
                }`} />

                {/* 직원 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold truncate ${
                      employee.is_hidden ? "text-gray-400" : "text-gray-800"
                    }`}>
                      {employee.full_name}
                    </span>
                    {employee.status === "new" && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-medium flex-shrink-0">
                        신규
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 truncate">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">
                      이번달 <span className="font-semibold text-gray-700">{employee.monthlyWorkDays}일</span>
                    </span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-500">
                      최근 <span className="font-semibold text-gray-700">
                        {employee.lastWorkDate ? dayjs(employee.lastWorkDate).format("MM/DD") : "-"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* 토글 버튼 */}
                <button
                  onClick={() => handleToggleHidden(employee.id, employee.is_hidden)}
                  disabled={togglingId === employee.id}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
                    employee.is_hidden
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {togglingId === employee.id
                    ? "..."
                    : employee.is_hidden
                    ? "활성화"
                    : "비활성"}
                </button>
              </div>
            ))
          )}
        </div>

        {/* 푸터 */}
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
