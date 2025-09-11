"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import dayjs from "dayjs";
import { format } from "date-fns";

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "employee";
  hourly_wage: number;
  created_at: string;
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<Employee> | null>(
    null
  );
  const supabase = createClient();

  // 직원 불러오기
  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching employees:", error);
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  // 시급 업데이트
  const handleSave = async (id: string) => {
    if (!editingData) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          role: editingData.role,
          hourly_wage: editingData.hourly_wage,
        })
        .eq("id", id);

      if (error) throw error;

      await fetchEmployees();
      setEditingId(null);
      setEditingData(null);
    } catch (err) {
      console.error("Error updating employee:", err);
      alert("직원 정보 업데이트 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 편집 모드 시작
  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setEditingData(employee);
  };

  // 입력 변경
  const handleChange = (field: keyof Employee, value: any) => {
    setEditingData((prev) => ({
      ...prev,
      [field]: field === "hourly_wage" ? Number(value) : value,
    }));
  };

  // ✅ 월별 근무 시간/일수 계산 (야간근무 보정 포함)
  const calculateMonthlyStats = async (employeeId: string, month: string) => {
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

    let totalMinutes = 0;
    logs?.forEach((log: any) => {
      if (log.work_type === "day_off" || !log.clock_in || !log.clock_out) {
        return;
      }

      const clockInStr = log.clock_in.includes(":")
        ? log.clock_in
        : log.clock_in + ":00";
      const clockOutStr = log.clock_out.includes(":")
        ? log.clock_out
        : log.clock_out + ":00";

      const baseDate = "2024-01-01";
      const start = dayjs(`${baseDate} ${clockInStr}`);
      let end = dayjs(`${baseDate} ${clockOutStr}`);

      // ✅ 야간 근무 보정 (종료시간이 시작시간보다 빠른 경우 → 다음날로 계산)
      if (end.isBefore(start)) {
        end = end.add(1, "day");
      }

      if (start.isValid() && end.isValid()) {
        totalMinutes += end.diff(start, "minute");
      }
    });

    const totalHours = totalMinutes > 0 ? totalMinutes / 60 : 0;
    return {
      totalHours,
      workDays: logs?.length || 0,
    };
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const getRoleName = (role: string) => (role === "admin" ? "관리자" : "직원");

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                이메일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                역할
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                시급
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                가입일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {employee.full_name || "이름 없음"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {employee.email}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {editingId === employee.id ? (
                    <select
                      value={editingData?.role || employee.role}
                      onChange={(e) => handleChange("role", e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                      disabled={loading}
                    >
                      <option value="admin">관리자</option>
                      <option value="employee">직원</option>
                    </select>
                  ) : (
                    getRoleName(employee.role)
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {editingId === employee.id ? (
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={editingData?.hourly_wage ?? employee.hourly_wage}
                        onChange={(e) =>
                          handleChange("hourly_wage", e.target.value)
                        }
                        className="border rounded px-2 py-1 w-24 text-sm"
                        disabled={loading}
                      />
                      <span className="ml-1">원</span>
                    </div>
                  ) : (
                    `${employee.hourly_wage?.toLocaleString() || "0"}원`
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {format(new Date(employee.created_at), "yyyy-MM-dd")}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  {editingId === employee.id ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSave(employee.id)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm px-2 py-1 bg-indigo-50 rounded"
                        disabled={loading}
                      >
                        {loading ? "저장 중..." : "저장"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingData(null);
                        }}
                        className="text-gray-600 hover:text-gray-900 text-sm px-2 py-1 bg-gray-100 rounded"
                        disabled={loading}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(employee)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm px-2 py-1 bg-indigo-50 rounded"
                    >
                      수정
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
