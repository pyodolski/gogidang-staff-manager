"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

type Employee = {
  id: string;
  full_name: string;
  email: string;
  hourly_wage: number;
};

type WorkLog = {
  id: number;
  date: string;
  clock_in: string;
  clock_out: string;
  status: string;
};

type Deduction = {
  id: number;
  name: string;
  amount: number;
  type: "fixed" | "percentage";
  is_active: boolean;
};

type Props = {
  employee: Employee;
  selectedMonth: string; // YYYY-MM 형식
  onClose: () => void;
};

export default function PayrollSlip({
  employee,
  selectedMonth,
  onClose,
}: Props) {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      setLoading(true);

      const startDate = dayjs(selectedMonth + "-01")
        .startOf("month")
        .format("YYYY-MM-DD");
      const endDate = dayjs(selectedMonth + "-01")
        .endOf("month")
        .format("YYYY-MM-DD");

      // 승인된 근무 기록 조회
      const { data: logs } = await supabase
        .from("work_logs")
        .select("*")
        .eq("user_id", employee.id)
        .eq("status", "approved")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      // 활성 공제 항목 조회
      const { data: deductionData } = await supabase
        .from("salary_deductions")
        .select("*")
        .eq("user_id", employee.id)
        .eq("is_active", true);

      setWorkLogs(logs || []);
      setDeductions(deductionData || []);
      setLoading(false);
    };

    fetchData();
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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded shadow-lg p-6">
          <div className="text-center">급여 명세서를 생성하고 있습니다...</div>
        </div>
      </div>
    );
  }

  // 급여 계산
  const totalHours = workLogs.reduce(
    (sum, log) => sum + calculateWorkHours(log.clock_in, log.clock_out),
    0
  );
  const grossPay = totalHours * employee.hourly_wage;

  // 기본 세금
  const incomeTax = grossPay * 0.03;
  const localTax = grossPay * 0.003;

  // 추가 공제
  const additionalDeductions = deductions.reduce((sum, deduction) => {
    if (deduction.type === "fixed") {
      return sum + deduction.amount;
    } else {
      return sum + (grossPay * deduction.amount) / 100;
    }
  }, 0);

  const totalDeductions = incomeTax + localTax + additionalDeductions;
  const netPay = grossPay - totalDeductions;

  const monthName = dayjs(selectedMonth + "-01").format("YYYY년 MM월");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 화면용 헤더 (인쇄 시 숨김) */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 className="text-xl font-bold">급여 명세서</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              인쇄
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              닫기
            </button>
          </div>
        </div>

        {/* 급여 명세서 본문 */}
        <div className="p-8 print:p-4">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">급여 명세서</h1>
            <div className="text-lg text-gray-600">{monthName}</div>
          </div>

          {/* 직원 정보 */}
          <div className="mb-6 p-4 bg-gray-50 rounded print:bg-transparent print:border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">성명:</span> {employee.full_name}
              </div>
              <div>
                <span className="font-medium">이메일:</span> {employee.email}
              </div>
              <div>
                <span className="font-medium">시급:</span>{" "}
                {employee.hourly_wage.toLocaleString()}원
              </div>
              <div>
                <span className="font-medium">발급일:</span>{" "}
                {dayjs().format("YYYY-MM-DD")}
              </div>
            </div>
          </div>

          {/* 근무 내역 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">근무 내역</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 py-2 px-3 text-left">
                      날짜
                    </th>
                    <th className="border border-gray-300 py-2 px-3 text-left">
                      출근시간
                    </th>
                    <th className="border border-gray-300 py-2 px-3 text-left">
                      퇴근시간
                    </th>
                    <th className="border border-gray-300 py-2 px-3 text-right">
                      근무시간
                    </th>
                    <th className="border border-gray-300 py-2 px-3 text-right">
                      일급
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workLogs.map((log) => {
                    const hours = calculateWorkHours(
                      log.clock_in,
                      log.clock_out
                    );
                    const dailyPay = hours * employee.hourly_wage;

                    return (
                      <tr key={log.id}>
                        <td className="border border-gray-300 py-2 px-3">
                          {dayjs(log.date).format("MM-DD (ddd)")}
                        </td>
                        <td className="border border-gray-300 py-2 px-3">
                          {log.clock_in}
                        </td>
                        <td className="border border-gray-300 py-2 px-3">
                          {log.clock_out}
                        </td>
                        <td className="border border-gray-300 py-2 px-3 text-right">
                          {hours.toFixed(1)}시간
                        </td>
                        <td className="border border-gray-300 py-2 px-3 text-right">
                          {dailyPay.toLocaleString()}원
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-semibold">
                    <td
                      className="border border-gray-300 py-2 px-3"
                      colSpan={3}
                    >
                      합계
                    </td>
                    <td className="border border-gray-300 py-2 px-3 text-right">
                      {totalHours.toFixed(1)}시간
                    </td>
                    <td className="border border-gray-300 py-2 px-3 text-right">
                      {grossPay.toLocaleString()}원
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 급여 계산 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 지급 내역 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">지급 내역</h3>
              <div className="border border-gray-300">
                <div className="flex justify-between p-3 border-b border-gray-300">
                  <span>
                    기본급 ({totalHours.toFixed(1)}시간 ×{" "}
                    {employee.hourly_wage.toLocaleString()}원)
                  </span>
                  <span className="font-medium">
                    {grossPay.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-blue-50 font-semibold">
                  <span>총 지급액</span>
                  <span>{grossPay.toLocaleString()}원</span>
                </div>
              </div>
            </div>

            {/* 공제 내역 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">공제 내역</h3>
              <div className="border border-gray-300">
                <div className="flex justify-between p-3 border-b border-gray-300">
                  <span>소득세 (3%)</span>
                  <span>{incomeTax.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between p-3 border-b border-gray-300">
                  <span>지방세 (0.3%)</span>
                  <span>{localTax.toLocaleString()}원</span>
                </div>
                {deductions.map((deduction) => {
                  const amount =
                    deduction.type === "fixed"
                      ? deduction.amount
                      : (grossPay * deduction.amount) / 100;

                  return (
                    <div
                      key={deduction.id}
                      className="flex justify-between p-3 border-b border-gray-300"
                    >
                      <span>
                        {deduction.name}
                        {deduction.type === "percentage" &&
                          ` (${deduction.amount}%)`}
                      </span>
                      <span>{amount.toLocaleString()}원</span>
                    </div>
                  );
                })}
                <div className="flex justify-between p-3 bg-red-50 font-semibold">
                  <span>총 공제액</span>
                  <span>{totalDeductions.toLocaleString()}원</span>
                </div>
              </div>
            </div>
          </div>

          {/* 실지급액 */}
          <div className="mt-6 p-4 bg-blue-100 rounded border-2 border-blue-300">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold">실지급액</span>
              <span className="text-2xl font-bold text-blue-600">
                {netPay.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 푸터 */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <div>
              본 급여명세서는 {dayjs().format("YYYY년 MM월 DD일")}에
              발급되었습니다.
            </div>
          </div>
        </div>
      </div>

      {/* 인쇄용 스타일 */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-4 {
            padding: 1rem !important;
          }
          .print\\:bg-transparent {
            background-color: transparent !important;
          }
          .print\\:border {
            border: 1px solid #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
