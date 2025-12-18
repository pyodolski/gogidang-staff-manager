"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import PayrollSlip from "./PayrollSlip";
import DeductionModal from "./DeductionModal";
import WorkLogModal from "./WorkLogModal";
import dayjs from "dayjs";
import { calculateWorkHours, isNightShift } from "../lib/timeUtils";

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
  const [isDownloading, setIsDownloading] = useState(false);
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

  // 엑셀 다운로드 함수
  const downloadExcelReport = async () => {
    setIsDownloading(true);

    try {
      // 활성화된 공제 항목들만 필터링
      const activeDeductions = deductions.filter((d) => d.is_active);

      // 공제 항목별 계산
      let totalDeductionAmount = 0;
      const deductionBreakdown: { [key: string]: number } = {};

      if (activeDeductions.length > 0) {
        activeDeductions.forEach((deduction) => {
          const amount =
            deduction.type === "fixed"
              ? deduction.amount
              : Math.floor((grossPay * deduction.amount) / 100);

          deductionBreakdown[deduction.name] = amount;
          totalDeductionAmount += amount;
        });
      }

      // CSV 데이터 생성
      const monthName = dayjs(selectedMonth + "-01").format("YYYY년 MM월");
      const csvData = [];

      // 헤더 정보
      csvData.push([`${employee.full_name} - ${monthName} 급여 보고서`]);
      csvData.push([]);
      csvData.push(["기본 정보"]);
      csvData.push(["직원명", employee.full_name]);
      csvData.push(["이메일", employee.email]);
      csvData.push(["시급", `${employee.hourly_wage.toLocaleString()}원`]);
      csvData.push(["보고서 생성일", dayjs().format("YYYY-MM-DD HH:mm:ss")]);
      csvData.push([]);

      // 급여 요약
      csvData.push(["급여 요약"]);
      csvData.push(["총 근무시간", `${totalHours.toFixed(1)}시간`]);
      csvData.push(["총 급여", `${grossPay.toLocaleString()}원`]);
      csvData.push(["총 공제", `${totalDeductionAmount.toLocaleString()}원`]);
      csvData.push(["실지급액", `${netPay.toLocaleString()}원`]);
      csvData.push([]);

      // 공제 내역
      if (Object.keys(deductionBreakdown).length > 0) {
        csvData.push(["공제 내역"]);
        Object.entries(deductionBreakdown).forEach(([name, amount]) => {
          csvData.push([name, `${amount.toLocaleString()}원`]);
        });
        csvData.push([]);
      }

      // 근무 기록
      csvData.push(["근무 기록"]);
      csvData.push([
        "날짜",
        "출근시간",
        "퇴근시간",
        "근무시간",
        "상태",
        "일급",
        "비고",
      ]);

      workLogs.forEach((log) => {
        const hours = calculateWorkHours(
          log.clock_in,
          log.clock_out,
          log.work_type
        );
        const dailyPay = Math.floor(hours * employee.hourly_wage);
        const isOffDay = log.work_type === "day_off";
        const isNight = isNightShift(log.clock_in, log.clock_out);

        let remarks = "";
        if (isOffDay) remarks = "휴무";
        else if (isNight) remarks = "야간근무";

        csvData.push([
          dayjs(log.date).format("YYYY-MM-DD (ddd)"),
          isOffDay ? "-" : log.clock_in || "-",
          isOffDay ? "-" : log.clock_out || "-",
          isOffDay ? "-" : `${hours.toFixed(1)}시간`,
          log.status === "approved"
            ? "승인"
            : log.status === "rejected"
            ? "반려"
            : "대기",
          isOffDay ? "-" : `${dailyPay.toLocaleString()}원`,
          remarks,
        ]);
      });

      // CSV 문자열 생성
      const csvContent = csvData
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      // BOM 추가 (한글 깨짐 방지)
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      // 다운로드
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${employee.full_name}_${monthName}_급여보고서.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Excel download error:", error);
      alert("엑셀 다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  // 급여 계산
  const approvedLogs = workLogs.filter((log) => log.status === "approved");
  const totalHours = approvedLogs.reduce(
    (sum, log) =>
      sum + calculateWorkHours(log.clock_in, log.clock_out, log.work_type),
    0
  );
  const grossPay = Math.floor(totalHours * employee.hourly_wage);

  // 활성화된 공제 항목들만 필터링
  const activeDeductions = deductions.filter((d) => d.is_active);

  // 공제 항목별 계산
  let incomeTax = 0;
  let localTax = 0;
  let additionalDeductions = 0;

  // 공제 항목이 있는 경우에만 계산
  if (activeDeductions.length > 0) {
    activeDeductions.forEach((deduction) => {
      const amount =
        deduction.type === "fixed"
          ? deduction.amount
          : Math.floor((grossPay * deduction.amount) / 100);

      if (deduction.name === "소득세") {
        incomeTax = amount;
      } else if (deduction.name === "지방세") {
        localTax = amount;
      } else {
        additionalDeductions += amount;
      }
    });
  }

  const totalDeductions = incomeTax + localTax + additionalDeductions;
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 모바일 최적화된 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b-2 border-indigo-100 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-indigo-50 rounded-xl transition-all hover:scale-110"
            >
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                {employee.full_name}
              </h1>
              <p className="text-sm text-gray-600 truncate flex items-center gap-1">
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {employee.email}
              </p>
            </div>
          </div>

          {/* 월 선택 및 액션 버튼 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 border-2 border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowPayrollSlip(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105"
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
              <button
                onClick={() => setShowDeductionModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:shadow-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105"
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
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
                공제관리
              </button>
              <button
                onClick={downloadExcelReport}
                disabled={isDownloading}
                className="col-span-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:shadow-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
              >
                {isDownloading ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    다운로드 중...
                  </>
                ) : (
                  <>
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
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    엑셀 다운로드
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 급여 요약 카드 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-white/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-3 shadow-lg">
              <svg
                className="w-6 h-6 text-white"
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
            <h3 className="text-xl font-bold text-gray-800">급여 요약</h3>
          </div>

          {/* 메인 지표 */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 mb-4 text-white shadow-xl">
            <div className="text-center">
              <p className="text-indigo-100 text-sm font-medium mb-2">
                실지급액
              </p>
              <p className="text-4xl font-bold mb-1">
                {netPay.toLocaleString()}원
              </p>
              <div className="flex items-center justify-center gap-2 text-indigo-100 text-xs">
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
                <span>승인된 급여</span>
              </div>
            </div>
          </div>

          {/* 상세 정보 그리드 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-100">
              <div className="flex items-center gap-2 mb-2">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-gray-600 font-medium">근무시간</p>
              </div>
              <p className="font-bold text-lg text-gray-800">
                {totalHours.toFixed(1)}시간
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-100">
              <div className="flex items-center gap-2 mb-2">
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
                <p className="text-gray-600 font-medium">시급</p>
              </div>
              <p className="font-bold text-lg text-gray-800">
                {employee.hourly_wage.toLocaleString()}원
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-100">
              <div className="flex items-center gap-2 mb-2">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-gray-600 font-medium">총급여</p>
              </div>
              <p className="font-bold text-lg text-gray-800">
                {grossPay.toLocaleString()}원
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border-2 border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-4 h-4 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 12H4"
                  />
                </svg>
                <p className="text-gray-600 font-medium">총공제</p>
              </div>
              <p className="font-bold text-lg text-red-600">
                {totalDeductions.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        {/* 근무 기록 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-white/50">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-5 rounded-t-2xl">
            <div className="flex justify-between items-start">
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white/20 rounded-lg p-2">
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
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold">근무 기록</h3>
                </div>
                <p className="text-blue-100 text-sm">
                  총 {workLogs.length}건 • 승인 {approvedLogs.length}건
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowAddWorkLogModal(true)}
                  className="px-3 py-2 text-xs bg-white text-blue-600 rounded-lg hover:bg-blue-50 whitespace-nowrap font-semibold shadow-md transition-all hover:scale-105"
                >
                  + 근무추가
                </button>
                <button
                  onClick={() => setShowAddBonusModal(true)}
                  className="px-3 py-2 text-xs bg-white text-green-600 rounded-lg hover:bg-green-50 whitespace-nowrap font-semibold shadow-md transition-all hover:scale-105"
                >
                  + 보너스
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {workLogs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-blue-600"
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
                </div>
                <p className="text-gray-700 font-semibold text-lg mb-2">
                  근무 기록이 없습니다
                </p>
                <p className="text-gray-500 text-sm">
                  근무추가 버튼을 눌러 기록을 추가하세요
                </p>
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
                const isNight = isNightShift(log.clock_in, log.clock_out);

                return (
                  <div
                    key={log.id}
                    className={`p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all cursor-pointer ${
                      isOffDay
                        ? "bg-gradient-to-r from-yellow-50 to-amber-50"
                        : ""
                    }`}
                    onClick={() => handleWorkLogClick(log)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg px-3 py-1">
                            <p className="font-bold text-white text-sm">
                              {dayjs(log.date).format("MM/DD (ddd)")}
                            </p>
                          </div>
                          {isOffDay && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-md">
                              휴무
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold shadow-md ${
                              log.status === "approved"
                                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                                : log.status === "rejected"
                                ? "bg-gradient-to-r from-red-500 to-pink-600 text-white"
                                : "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                            }`}
                          >
                            {log.status === "approved"
                              ? "승인"
                              : log.status === "rejected"
                              ? "반려"
                              : "대기"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 font-medium">
                          {isOffDay ? (
                            <span className="text-amber-700">휴무일</span>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
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
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span>
                                  {log.clock_in} ~ {log.clock_out}
                                </span>
                                {isNight && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-lg font-semibold">
                                    야간
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 ml-6">
                                {hours.toFixed(1)}시간 근무
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-800">
                            {isOffDay ? "-" : `${dailyPay.toLocaleString()}원`}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkLog(log.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-white/50">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 rounded-t-2xl">
            <div className="flex items-center gap-3 text-white">
              <div className="bg-white/20 rounded-lg p-2">
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
                    d="M20 12H4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">공제 항목</h3>
                <p className="text-red-100 text-sm">
                  활성 {activeDeductions.length}개 • 전체 {deductions.length}개
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {deductions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="bg-gradient-to-br from-red-100 to-pink-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </div>
                <p className="text-gray-700 font-semibold text-lg mb-2">
                  공제 항목이 없습니다
                </p>
                <p className="text-gray-500 text-sm">
                  공제관리 버튼을 눌러 항목을 추가하세요
                </p>
              </div>
            ) : (
              deductions.map((deduction) => {
                const actualAmount =
                  deduction.type === "fixed"
                    ? deduction.amount
                    : Math.floor((grossPay * deduction.amount) / 100);

                return (
                  <div
                    key={deduction.id}
                    className="p-4 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-gray-800 text-lg">
                            {deduction.name}
                          </span>
                          <button
                            onClick={() => handleToggleDeduction(deduction)}
                            className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer shadow-md transition-all hover:scale-105 ${
                              deduction.is_active
                                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                                : "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                            }`}
                          >
                            {deduction.is_active ? "✓ 활성" : "✕ 비활성"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg
                            className="w-4 h-4 text-indigo-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                            />
                          </svg>
                          <span className="font-medium">
                            {deduction.type === "fixed"
                              ? "고정금액"
                              : `비율 (${deduction.amount}%)`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xl text-red-600">
                          -{actualAmount.toLocaleString()}원
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditDeduction(deduction)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-110"
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
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteDeduction(deduction.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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
