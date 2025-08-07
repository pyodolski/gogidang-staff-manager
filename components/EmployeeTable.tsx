"use client";

import { useState } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "employee";
  hourly_wage: number;
  created_at: string;
}

interface EmployeeTableProps {
  employees: Employee[];
  onUpdate: () => Promise<void>;
}

export default function EmployeeTable({
  employees,
  onUpdate,
}: EmployeeTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<Employee> | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setEditingData(employee);
  };

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

      await onUpdate(); // 상위 컴포넌트에서 데이터 다시 불러오기
      setEditingId(null);
      setEditingData(null);
    } catch (error) {
      console.error("Error updating employee:", error);
      alert("직원 정보 업데이트 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Employee, value: any) => {
    setEditingData((prev) => ({
      ...prev,
      [field]: field === "hourly_wage" ? Number(value) : value,
    }));
  };

  const getRoleName = (role: string) => {
    return role === "admin" ? "관리자" : "직원";
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이메일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                역할
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                시급
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                가입일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {employee.full_name || "이름 없음"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {employee.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(employee.created_at), "yyyy-MM-dd")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
