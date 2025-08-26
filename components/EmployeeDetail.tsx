"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import PayrollSlip from "./PayrollSlip";
import DeductionModal from "./DeductionModal";
import WorkLogModal from "./WorkLogModal";
import dayjs from "dayjs";

type Employee = {
  id: string;
  email: string;
  full_name: string;
  hourly_wage: number;
};

type WorkLog = {
  id: number;
  user_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
  work_type?: string;
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
  onUpdate?: () => void;
};

export default function EmployeeDetail({ employee, onBack, onUpdate }: Props) {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [showPayrollSlip, setShowPayrollSlip] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);
  const [selectedWorkLog, setSelectedWorkLog] = useState<WorkLog | null>(null);
  const [showAddWorkLogModal, setShowAddWorkLogModal] = useState(false);
  const [showAddBonusModal, setShowAddBonusModal] = useState(false);
  const [showEditDeductionModal, setShowEditDeductionModal] = useState(false);
  const [selectedDeduction, setSelectedDeduction] = useState<Deduction | null>(
    null
  );

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    const supabase = createClient();
    setLoading(true);

    const startDate = dayjs(selectedMonth + "-01")
      .startOf("month")
      .format("YYYY-MM-DD");
    const endDate = dayjs(selectedMonth + "-01")
      .endOf("month")
      .format("YYYY-MM-DD");

    // 근무 기록 조회
    const { data: logs } = await supabase
      .from("work_logs")
      .select("*")
      .eq("user_id", employee.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    // 공제 항목 조회
    const { data: deductionData } = await supabase
      .from("salary_deductions")
      .select("*")
      .eq("user_id", employee.id);

    setWorkLogs(logs || []);
    setDeductions(deductionData || []);
    setLoading(false);
  };

  const calculateWorkHours = (
    clockIn: string | null,
    clockOut: string | null,
    workType?: string
  ) => {
    if (workType === "day_off" || !clockIn || !clockOut) {
      return 0;
    }

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

  const handleWorkLogClick = (log: WorkLog) => {
    setSelectedWorkLog(log);
    setShowWorkLogModal(true);
  };

  const handleWorkLogUpdate = () => {
    fetchData();
    setShowWorkLogModal(false);
    setSelectedWorkLog(null);
    onUpdate?.();
  };

  const handleDeductionUpdate = () => {
    fetchData();
    setShowDeductionModal(false);
    onUpdate?.();
  };

  const handleDeleteWorkLog = async (logId: number) => {
    if (!confirm("이 근무 기록을 삭제하시겠습니까?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("work_logs").delete().eq("id", logId);

    if (error) {
      alert("삭제 중 오류가 발생했습니다: " + error.message);
    } else {
      fetchData();
      onUpdate?.();
    }
  };

  const handleToggleDeduction = async (deduction: Deduction) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("salary_deductions")
      .update({ is_active: !deduction.is_active })
      .eq("id", deduction.id);

    if (error) {
      alert("상태 변경 중 오류가 발생했습니다: " + error.message);
    } else {
      fetchData();
      onUpdate?.();
    }
  };

  const handleDeleteDeduction = async (deductionId: number) => {
    if (!confirm("이 공제 항목을 삭제하시겠습니까?")) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("salary_deductions")
      .delete()
      .eq("id", deductionId);

    if (error) {
      alert("삭제 중 오류가 발생했습니다: " + error.message);
    } else {
      fetchData();
      onUpdate?.();
    }
  };

  const handleEditDeduction = (deduction: Deduction) => {
    setSelectedDeduction(deduction);
    setShowEditDeductionModal(true);
  };

  // 급여 계산
  const approvedLogs = workLogs.filter((log) => log.status === "approved");
  const totalHours = approvedLogs.reduce(
    (sum, log) =>
      sum + calculateWorkHours(log.clock_in, log.clock_out, log.work_type),
    0
  );
  const grossPay = Math.floor(totalHours * employee.hourly_wage);

  // 기본 세금 계산 (소수점 버림)
  const incomeTax = Math.floor(grossPay * 0.03);
  const localTax = Math.floor(grossPay * 0.003);

  // 추가 공제 계산 (4대보험, 기타) - 소수점 버림
  const activeDeductions = deductions.filter((d) => d.is_active);
  const additionalDeductions = activeDeductions.reduce((sum, deduction) => {
    if (deduction.type === "fixed") {
      return sum + deduction.amount;
    } else {
      return sum + Math.floor((grossPay * deduction.amount) / 100);
    }
  }, 0);

  const totalDeductions = Math.floor(
    incomeTax + localTax + additionalDeductions
  );
  const netPay = Math.floor(grossPay - totalDeductions);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 최적화된 헤더 */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-800 truncate">
                {employee.full_name}
              </h1>
              <p className="text-sm text-gray-600 truncate">{employee.email}</p>
            </div>
          </div>

          {/* 월 선택 및 액션 버튼 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
                조회 월:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPayrollSlip(true)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                급여명세서
              </button>
              <button
                onClick={() => setShowDeductionModal(true)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                공제관리
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 급여 요약 카드 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            급여 요약
          </h3>

          {/* 메인 지표 */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 mb-4 text-white">
            <div className="text-center">
              <p className="text-blue-100 text-sm">실지급액</p>
              <p className="text-2xl font-bold">{netPay.toLocaleString()}원</p>
            </div>
          </div>

          {/* 상세 정보 그리드 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-600 mb-1">근무시간</p>
              <p className="font-semibold">{totalHours.toFixed(1)}시간</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-600 mb-1">시급</p>
              <p className="font-semibold">
                {employee.hourly_wage.toLocaleString()}원
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-600 mb-1">총급여</p>
              <p className="font-semibold">{grossPay.toLocaleString()}원</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-600 mb-1">총공제</p>
              <p className="font-semibold text-red-600">
                {totalDeductions.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        {/* 근무 기록 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  근무 기록
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  총 {workLogs.length}건 (승인: {approvedLogs.length}건)
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowAddWorkLogModal(true)}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                >
                  근무추가
                </button>
                <button
                  onClick={() => setShowAddBonusModal(true)}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
                >
                  보너스
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {workLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p>근무 기록이 없습니다</p>
              </div>
            ) : (
              workLogs.map((log) => {
                const hours = calculateWorkHours(
                  log.clock_in,
                  log.clock_out,
                  log.work_type
                );
                const dailyPay = Math.floor(hours * employee.hourly_wage);
                const isOffDay = log.work_type === "day_off";

                return (
                  <div
                    key={log.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      isOffDay ? "bg-yellow-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleWorkLogClick(log)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-800">
                            {dayjs(log.date).format("MM/DD (ddd)")}
                          </p>
                          {isOffDay && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              휴무
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              log.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : log.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {log.status === "approved"
                              ? "승인"
                              : log.status === "rejected"
                              ? "반려"
                              : "대기"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {isOffDay ? (
                            "휴무일"
                          ) : (
                            <>
                              {log.clock_in} ~ {log.clock_out} (
                              {hours.toFixed(1)}시간)
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-semibold text-gray-800">
                            {isOffDay ? "-" : `${dailyPay.toLocaleString()}원`}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkLog(log.id);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 공제 항목 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">공제 항목</h3>
            <p className="text-sm text-gray-600 mt-1">
              활성 {activeDeductions.length}개 / 전체 {deductions.length}개
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {/* 기본 세금 */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-800">소득세 (3%)</span>
                <span className="font-semibold">
                  {incomeTax.toLocaleString()}원
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-800">지방세 (0.3%)</span>
                <span className="font-semibold">
                  {localTax.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 추가 공제 항목 */}
            {deductions.map((deduction) => {
              const actualAmount =
                deduction.type === "fixed"
                  ? deduction.amount
                  : Math.floor((grossPay * deduction.amount) / 100);

              return (
                <div key={deduction.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800">
                          {deduction.name}
                        </span>
                        <button
                          onClick={() => handleToggleDeduction(deduction)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                            deduction.is_active
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          }`}
                        >
                          {deduction.is_active ? "활성" : "비활성"}
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        {deduction.type === "fixed"
                          ? "고정금액"
                          : `비율 (${deduction.amount}%)`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {actualAmount.toLocaleString()}원
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditDeduction(deduction)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteDeduction(deduction.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 모달들 */}
      {showPayrollSlip && (
        <PayrollSlip
          employee={employee}
          selectedMonth={selectedMonth}
          onClose={() => setShowPayrollSlip(false)}
        />
      )}

      {showDeductionModal && (
        <DeductionModal
          employee={employee}
          onClose={() => setShowDeductionModal(false)}
          onSave={handleDeductionUpdate}
        />
      )}

      {showEditDeductionModal && selectedDeduction && (
        <DeductionModal
          employee={employee}
          deduction={selectedDeduction}
          onClose={() => {
            setShowEditDeductionModal(false);
            setSelectedDeduction(null);
          }}
          onSave={() => {
            handleDeductionUpdate();
            setShowEditDeductionModal(false);
            setSelectedDeduction(null);
          }}
        />
      )}

      {showWorkLogModal && selectedWorkLog && (
        <WorkLogModal
          employee={employee}
          workLog={selectedWorkLog}
          onClose={() => {
            setShowWorkLogModal(false);
            setSelectedWorkLog(null);
          }}
          onSave={handleWorkLogUpdate}
        />
      )}

      {showAddWorkLogModal && (
        <WorkLogModal
          employee={employee}
          onClose={() => setShowAddWorkLogModal(false)}
          onSave={() => {
            handleWorkLogUpdate();
            setShowAddWorkLogModal(false);
          }}
        />
      )}

      {/* 보너스 추가 모달 */}
      {showAddBonusModal && (
        <BonusModal
          employee={employee}
          onClose={() => setShowAddBonusModal(false)}
          onSave={() => {
            handleWorkLogUpdate();
            setShowAddBonusModal(false);
          }}
        />
      )}
    </div>
  );
}

// 보너스 모달 컴포넌트
function BonusModal({
  employee,
  onClose,
  onSave,
}: {
  employee: Employee;
  onClose: () => void;
  onSave: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // 보너스를 특별한 근무 기록으로 저장 (시간은 0으로, 금액은 별도 계산)
    const bonusAmount = parseInt(amount);
    const equivalentHours = bonusAmount / employee.hourly_wage;

    const { error } = await supabase.from("work_logs").insert({
      user_id: employee.id,
      date: date,
      clock_in: "00:00",
      clock_out: "00:00",
      status: "approved",
      // 보너스임을 표시하기 위한 특별한 형식
      notes: `보너스: ${description} (${bonusAmount.toLocaleString()}원)`,
    });

    if (error) {
      alert("보너스 추가 중 오류가 발생했습니다: " + error.message);
    } else {
      onSave();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">보너스 추가</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              날짜
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              보너스 금액 (원)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="예: 50000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              보너스 사유
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 우수사원 보너스"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "추가 중..." : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
