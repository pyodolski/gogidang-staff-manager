"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";
import WorkLogModal from "./WorkLogModal";
import DeductionModal from "./DeductionModal";
import PayrollSlip from "./PayrollSlip";

type Employee = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  hourly_wage: number;
  created_at: string;
};

type WorkLog = {
  id: number;
  user_id: string;
  date: string;
  clock_in: string;
  clock_out: string;
  status: string;
  created_at: string;
};

type Deduction = {
  id: number;
  user_id: string;
  name: string;
  amount: number;
  type: "fixed" | "percentage";
  is_active: boolean;
};

type Props = {
  employee: Employee;
  onBack: () => void;
  onUpdate: () => void;
};

export default function EmployeeDetail({ employee, onBack, onUpdate }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkLog | null>(null);
  const [editingDeduction, setEditingDeduction] = useState<Deduction | null>(
    null
  );
  const [showPayrollSlip, setShowPayrollSlip] = useState(false);

  const fetchWorkLogs = async () => {
    const supabase = createClient();

    const startDate = dayjs(selectedMonth + "-01")
      .startOf("month")
      .format("YYYY-MM-DD");
    const endDate = dayjs(selectedMonth + "-01")
      .endOf("month")
      .format("YYYY-MM-DD");

    const { data, error } = await supabase
      .from("work_logs")
      .select("*")
      .eq("user_id", employee.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching work logs:", error);
    } else {
      setWorkLogs(data || []);
    }
  };

  const fetchDeductions = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("salary_deductions")
      .select("*")
      .eq("user_id", employee.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching deductions:", error);
    } else {
      setDeductions(data || []);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchWorkLogs(), fetchDeductions()]);
      setLoading(false);
    };
    loadData();
  }, [employee.id, selectedMonth]);

  const calculateWorkHours = (clockIn: string, clockOut: string) => {
    const clockInStr = clockIn.includes(":") ? clockIn : clockIn + ":00";
    const clockOutStr = clockOut.includes(":") ? clockOut : clockOut + ":00";

    const baseDate = "2024-01-01";
    const start = dayjs(`${baseDate} ${clockInStr}`);
    const end = dayjs(`${baseDate} ${clockOutStr}`);

    if (start.isValid() && end.isValid()) {
      const minutes = end.diff(start, "minute");
      return minutes > 0 ? minutes / 60 : 0;
    }
    return 0;
  };

  const deleteWorkLog = async (logId: number) => {
    if (!confirm("이 근무 기록을 삭제하시겠습니까?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("work_logs").delete().eq("id", logId);

    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      fetchWorkLogs();
    }
  };

  const toggleDeduction = async (deductionId: number, isActive: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("salary_deductions")
      .update({ is_active: !isActive })
      .eq("id", deductionId);

    if (error) {
      alert("상태 변경 실패: " + error.message);
    } else {
      fetchDeductions();
    }
  };

  const deleteDeduction = async (deductionId: number) => {
    if (!confirm("이 공제 항목을 삭제하시겠습니까?")) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("salary_deductions")
      .delete()
      .eq("id", deductionId);

    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      fetchDeductions();
    }
  };

  // 급여 계산
  const approvedLogs = workLogs.filter((log) => log.status === "approved");
  const totalHours = approvedLogs.reduce(
    (sum, log) => sum + calculateWorkHours(log.clock_in, log.clock_out),
    0
  );
  const grossPay = totalHours * employee.hourly_wage;

  // 기본 세금 계산
  const incomeTax = grossPay * 0.03;
  const localTax = grossPay * 0.003;

  // 추가 공제 계산 (4대보험, 기타)
  const activeDeductions = deductions.filter((d) => d.is_active);
  const additionalDeductions = activeDeductions.reduce((sum, deduction) => {
    if (deduction.type === "fixed") {
      return sum + deduction.amount;
    } else {
      return sum + (grossPay * deduction.amount) / 100;
    }
  }, 0);

  const totalDeductions = incomeTax + localTax + additionalDeductions;
  const netPay = grossPay - totalDeductions;

  if (loading) {
    return (
      <div className="bg-white rounded shadow p-4">
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              ← 뒤로
            </button>
            <div>
              <h2 className="text-xl font-bold">{employee.full_name}</h2>
              <p className="text-gray-600">{employee.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPayrollSlip(true)}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              급여명세서 출력
            </button>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">조회 월:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </div>
          </div>
        </div>

        {/* 급여 요약 */}
        <div className="p-4 bg-gray-50 rounded">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-600">총 근무시간</div>
              <div className="text-lg font-semibold">
                {totalHours.toFixed(1)}시간
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">시급</div>
              <div className="text-lg font-semibold">
                {employee.hourly_wage.toLocaleString()}원
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">총 급여</div>
              <div className="text-lg font-semibold">
                {grossPay.toLocaleString()}원
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">실지급액</div>
              <div className="text-lg font-semibold text-blue-600">
                {netPay.toLocaleString()}원
              </div>
            </div>
          </div>

          {/* 공제 내역 */}
          <div className="border-t pt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">
              공제 내역
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-gray-600">소득세:</span>
                <span className="ml-1 font-medium">
                  {incomeTax.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-gray-600">지방세:</span>
                <span className="ml-1 font-medium">
                  {localTax.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-gray-600">기타공제:</span>
                <span className="ml-1 font-medium">
                  {additionalDeductions.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-gray-600">총공제:</span>
                <span className="ml-1 font-medium text-red-600">
                  {totalDeductions.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 근무 기록 */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">근무 기록</h3>
          <button
            onClick={() => {
              setEditingWork(null);
              setShowWorkModal(true);
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            근무 추가
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-3 text-left">날짜</th>
                <th className="py-2 px-3 text-left">출근시간</th>
                <th className="py-2 px-3 text-left">퇴근시간</th>
                <th className="py-2 px-3 text-left">근무시간</th>
                <th className="py-2 px-3 text-left">상태</th>
                <th className="py-2 px-3 text-center">액션</th>
              </tr>
            </thead>
            <tbody>
              {workLogs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3">
                    {dayjs(log.date).format("YYYY-MM-DD")}
                  </td>
                  <td className="py-2 px-3">{log.clock_in}</td>
                  <td className="py-2 px-3">{log.clock_out}</td>
                  <td className="py-2 px-3">
                    {calculateWorkHours(log.clock_in, log.clock_out).toFixed(1)}
                    시간
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        log.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : log.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {log.status === "approved"
                        ? "승인됨"
                        : log.status === "rejected"
                        ? "거절됨"
                        : "대기중"}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => {
                          setEditingWork(log);
                          setShowWorkModal(true);
                        }}
                        className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => deleteWorkLog(log.id)}
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 급여 공제 항목 */}
      <div className="bg-white rounded shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">급여 공제 항목</h3>
          <button
            onClick={() => {
              setEditingDeduction(null);
              setShowDeductionModal(true);
            }}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            공제 추가
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-3 text-left">항목명</th>
                <th className="py-2 px-3 text-left">유형</th>
                <th className="py-2 px-3 text-left">금액/비율</th>
                <th className="py-2 px-3 text-left">실제 공제액</th>
                <th className="py-2 px-3 text-left">상태</th>
                <th className="py-2 px-3 text-center">액션</th>
              </tr>
            </thead>
            <tbody>
              {/* 기본 세금 항목들 (수정 불가) */}
              <tr className="border-b bg-blue-50">
                <td className="py-2 px-3 font-medium">소득세</td>
                <td className="py-2 px-3">비율</td>
                <td className="py-2 px-3">3%</td>
                <td className="py-2 px-3">{incomeTax.toLocaleString()}원</td>
                <td className="py-2 px-3">
                  <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                    기본항목
                  </span>
                </td>
                <td className="py-2 px-3 text-center">
                  <span className="text-xs text-gray-500">수정불가</span>
                </td>
              </tr>
              <tr className="border-b bg-blue-50">
                <td className="py-2 px-3 font-medium">지방세</td>
                <td className="py-2 px-3">비율</td>
                <td className="py-2 px-3">0.3%</td>
                <td className="py-2 px-3">{localTax.toLocaleString()}원</td>
                <td className="py-2 px-3">
                  <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                    기본항목
                  </span>
                </td>
                <td className="py-2 px-3 text-center">
                  <span className="text-xs text-gray-500">수정불가</span>
                </td>
              </tr>

              {/* 추가 공제 항목들 (수정 가능) */}
              {deductions.map((deduction) => {
                const actualAmount =
                  deduction.type === "fixed"
                    ? deduction.amount
                    : (grossPay * deduction.amount) / 100;

                return (
                  <tr key={deduction.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">{deduction.name}</td>
                    <td className="py-2 px-3">
                      {deduction.type === "fixed" ? "고정금액" : "비율"}
                    </td>
                    <td className="py-2 px-3">
                      {deduction.type === "fixed"
                        ? `${deduction.amount.toLocaleString()}원`
                        : `${deduction.amount}%`}
                    </td>
                    <td className="py-2 px-3">
                      {actualAmount.toLocaleString()}원
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          deduction.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {deduction.is_active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() =>
                            toggleDeduction(deduction.id, deduction.is_active)
                          }
                          className={`px-2 py-1 text-white text-xs rounded ${
                            deduction.is_active
                              ? "bg-gray-600 hover:bg-gray-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {deduction.is_active ? "비활성" : "활성"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingDeduction(deduction);
                            setShowDeductionModal(true);
                          }}
                          className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => deleteDeduction(deduction.id)}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 공제 요약 */}
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <div className="text-sm font-medium text-gray-700 mb-2">
            공제 요약
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">소득세 (3%):</span>
                <span>{incomeTax.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">지방세 (0.3%):</span>
                <span>{localTax.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">기타 공제:</span>
                <span>{additionalDeductions.toLocaleString()}원</span>
              </div>
            </div>
            <div className="border-l pl-4">
              <div className="flex justify-between font-semibold">
                <span>총 공제액:</span>
                <span className="text-red-600">
                  {totalDeductions.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between font-semibold text-blue-600 mt-2 pt-2 border-t">
                <span>실지급액:</span>
                <span>{netPay.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 모달들 */}
      {showWorkModal && (
        <WorkLogModal
          employee={employee}
          workLog={editingWork}
          onClose={() => {
            setShowWorkModal(false);
            setEditingWork(null);
          }}
          onSave={() => {
            fetchWorkLogs();
            setShowWorkModal(false);
            setEditingWork(null);
          }}
        />
      )}

      {showDeductionModal && (
        <DeductionModal
          employee={employee}
          deduction={editingDeduction}
          onClose={() => {
            setShowDeductionModal(false);
            setEditingDeduction(null);
          }}
          onSave={() => {
            fetchDeductions();
            setShowDeductionModal(false);
            setEditingDeduction(null);
          }}
        />
      )}

      {showPayrollSlip && (
        <PayrollSlip
          employee={employee}
          selectedMonth={selectedMonth}
          onClose={() => setShowPayrollSlip(false)}
        />
      )}
    </div>
  );
}
