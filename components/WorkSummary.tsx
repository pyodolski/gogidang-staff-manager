import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

type Props = {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
};

export default function WorkSummary({
  selectedMonth,
  setSelectedMonth,
}: Props) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const monthStr = dayjs(selectedMonth).format("YYYY-MM");

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      // 로그인된 유저 정보
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      // 해당 월의 승인된 근무 내역
      const { data: logs } = await supabase
        .from("work_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .gte("date", dayjs(selectedMonth).startOf("month").format("YYYY-MM-DD"))
        .lte("date", dayjs(selectedMonth).endOf("month").format("YYYY-MM-DD"));
      // 시급: profiles 테이블에서 가져오거나, 임시로 10000원
      let hourly = 10000;
      const { data: profile } = await supabase
        .from("profiles")
        .select("hourly_wage")
        .eq("id", user.id)
        .single();
      if (profile?.hourly_wage) hourly = profile.hourly_wage;
      // 총 근무시간(분 단위 합산)
      let totalMinutes = 0;
      logs?.forEach((log: any) => {
        // 시간 문자열을 더 안전하게 파싱
        const clockInStr = log.clock_in.includes(":")
          ? log.clock_in
          : log.clock_in + ":00";
        const clockOutStr = log.clock_out.includes(":")
          ? log.clock_out
          : log.clock_out + ":00";

        // 오늘 날짜를 기준으로 시간 생성 (날짜 부분은 동일하게)
        const baseDate = "2024-01-01";
        const start = dayjs(`${baseDate} ${clockInStr}`);
        const end = dayjs(`${baseDate} ${clockOutStr}`);

        if (start.isValid() && end.isValid()) {
          const minutes = end.diff(start, "minute");
          totalMinutes += minutes;
        } else {
          console.error("Invalid time format:", log.clock_in, log.clock_out);
        }
      });

      const totalHours = totalMinutes > 0 ? totalMinutes / 60 : 0;
      const totalPay = totalHours > 0 ? Math.floor(hourly * totalHours) : 0;

      // 기본 세금 계산 (소수점 버림)
      const incomeTax = totalPay > 0 ? Math.floor(totalPay * 0.03) : 0;
      const localTax = totalPay > 0 ? Math.floor(totalPay * 0.003) : 0;

      // 추가 공제 항목들 조회 (기타에 포함)
      const { data: deductions } = await supabase
        .from("salary_deductions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      let additionalDeductions = 0;
      deductions?.forEach((deduction: any) => {
        if (deduction.type === "fixed") {
          additionalDeductions += deduction.amount;
        } else {
          additionalDeductions += Math.floor(
            (totalPay * deduction.amount) / 100
          );
        }
      });

      const etc = Math.floor(additionalDeductions);
      const realPay =
        totalPay > 0 ? Math.floor(totalPay - (incomeTax + localTax + etc)) : 0;
      setSummary({
        month: monthStr,
        totalHours,
        hourly,
        totalPay,
        incomeTax,
        localTax,
        etc,
        realPay,
      });
      setLoading(false);
    };
    fetchSummary();
  }, [selectedMonth]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(new Date(e.target.value + "-01"));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <div className="text-gray-500">데이터를 불러올 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">급여 요약</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">조회 월:</label>
          <input
            type="month"
            value={summary.month}
            onChange={handleMonthChange}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 메인 지표 - 실지급액 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-blue-100 text-sm font-medium">
              이번 달 실지급액
            </p>
            <p className="text-3xl font-bold mt-1">
              {summary.realPay.toLocaleString()}원
            </p>
          </div>
          <div className="bg-white/20 rounded-full p-3">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 상세 정보 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 근무시간 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-full p-2">
              <svg
                className="w-5 h-5 text-green-600"
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
            </div>
            <div>
              <p className="text-sm text-gray-600">총 근무시간</p>
              <p className="text-lg font-semibold text-gray-800">
                {summary.totalHours.toFixed(1)}시간
              </p>
            </div>
          </div>
        </div>

        {/* 시급 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-full p-2">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">시급</p>
              <p className="text-lg font-semibold text-gray-800">
                {summary.hourly.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        {/* 총 급여 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-full p-2">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">총 급여</p>
              <p className="text-lg font-semibold text-gray-800">
                {summary.totalPay.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        {/* 소득세 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 rounded-full p-2">
              <svg
                className="w-5 h-5 text-red-600"
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
              <p className="text-sm text-gray-600">소득세</p>
              <p className="text-lg font-semibold text-gray-800">
                {summary.incomeTax.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        {/* 지방세 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 rounded-full p-2">
              <svg
                className="w-5 h-5 text-red-600"
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
              <p className="text-sm text-gray-600">지방세</p>
              <p className="text-lg font-semibold text-gray-800">
                {summary.localTax.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        {/* 기타 공제 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 rounded-full p-2">
              <svg
                className="w-5 h-5 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">기타 공제</p>
              <p className="text-lg font-semibold text-gray-800">
                {summary.etc.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
