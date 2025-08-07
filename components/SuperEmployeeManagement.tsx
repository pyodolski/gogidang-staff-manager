"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { UserRole, getRoleDisplayName } from "../lib/auth-utils";

type Employee = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  hourly_wage: number;
  created_at: string;
};

export default function SuperEmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setEmployees(data || []);
    setLoading(false);
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (!selectedEmployee) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", selectedEmployee.id);

    if (error) {
      alert("권한 변경 중 오류가 발생했습니다: " + error.message);
      return;
    }

    alert(
      `${selectedEmployee.full_name}님의 권한이 ${getRoleDisplayName(
        newRole
      )}로 변경되었습니다.`
    );
    setShowRoleModal(false);
    setSelectedEmployee(null);
    fetchEmployees();
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    const supabase = createClient();

    // 먼저 관련 데이터들을 삭제 (CASCADE로 자동 삭제되지만 명시적으로)
    await supabase
      .from("work_logs")
      .delete()
      .eq("user_id", selectedEmployee.id);
    await supabase
      .from("salary_deductions")
      .delete()
      .eq("user_id", selectedEmployee.id);

    // 프로필 삭제
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", selectedEmployee.id);

    if (error) {
      alert("직원 삭제 중 오류가 발생했습니다: " + error.message);
      return;
    }

    alert(`${selectedEmployee.full_name}님의 계정이 삭제되었습니다.`);
    setShowDeleteModal(false);
    setSelectedEmployee(null);
    fetchEmployees();
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "super":
        return "bg-red-100 text-red-800";
      case "admin":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">전체 직원 관리</h3>
        <p className="text-sm text-gray-600 mt-1">
          모든 직원의 권한을 관리하고 계정을 삭제할 수 있습니다
        </p>
      </div>

      {/* 직원 목록 */}
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  이름
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  이메일
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  권한
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  시급
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  가입일
                </th>
                <th className="text-center py-3 px-2 font-medium text-gray-600">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-2 font-medium text-gray-800">
                    {employee.full_name}
                  </td>
                  <td className="py-3 px-2 text-gray-600">{employee.email}</td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                        employee.role
                      )}`}
                    >
                      {getRoleDisplayName(employee.role)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-600">
                    {employee.hourly_wage.toLocaleString()}원
                  </td>
                  <td className="py-3 px-2 text-gray-600">
                    {new Date(employee.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setShowRoleModal(true);
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        권한변경
                      </button>
                      {employee.role !== "super" && (
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowDeleteModal(true);
                          }}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 권한 변경 모달 */}
      {showRoleModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">권한 변경</h3>
            <p className="text-gray-600 mb-4">
              <strong>{selectedEmployee.full_name}</strong>님의 권한을
              변경하시겠습니까?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              현재 권한:{" "}
              <strong>{getRoleDisplayName(selectedEmployee.role)}</strong>
            </p>

            <div className="space-y-3 mb-6">
              {(["employee", "admin", "super"] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  disabled={role === selectedEmployee.role}
                  className={`w-full p-3 text-left rounded-lg border transition-colors ${
                    role === selectedEmployee.role
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="font-medium">{getRoleDisplayName(role)}</div>
                  <div className="text-sm text-gray-500">
                    {role === "employee" && "기본 직원 권한"}
                    {role === "admin" && "근무 승인 및 급여 관리"}
                    {role === "super" && "모든 직원 계정 관리"}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedEmployee(null);
                }}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-red-600 mb-4">
              직원 삭제
            </h3>
            <p className="text-gray-600 mb-4">
              <strong>{selectedEmployee.full_name}</strong>님의 계정을
              삭제하시겠습니까?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-600">
                ⚠️ 이 작업은 되돌릴 수 없습니다. 모든 근무 기록과 급여 데이터가
                함께 삭제됩니다.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedEmployee(null);
                }}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteEmployee}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
