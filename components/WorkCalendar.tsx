"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import Calendar from "react-calendar";
import dayjs from "dayjs";
import "react-calendar/dist/Calendar.css";

type Props = {
  selectedMonth: Date;
};

export default function WorkCalendar({ selectedMonth }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("work_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .gte("date", dayjs(selectedMonth).startOf("month").format("YYYY-MM-DD"))
        .lte("date", dayjs(selectedMonth).endOf("month").format("YYYY-MM-DD"));
      setLogs(data || []);
    };
    fetchLogs();
  }, [selectedMonth]);

  const tileContent = ({ date }: { date: Date }) => {
    const found = logs.find((log) => dayjs(log.date).isSame(date, "day"));
    if (found)
      return <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-1" />;
    return null;
  };

  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    const found = logs.find((log) => dayjs(log.date).isSame(date, "day"));
    if (found) {
      // 시간 문자열을 더 안전하게 파싱
      const clockInStr = found.clock_in.includes(":")
        ? found.clock_in
        : found.clock_in + ":00";
      const clockOutStr = found.clock_out.includes(":")
        ? found.clock_out
        : found.clock_out + ":00";

      // 오늘 날짜를 기준으로 시간 생성
      const baseDate = "2024-01-01";
      const start = dayjs(`${baseDate} ${clockInStr}`);
      const end = dayjs(`${baseDate} ${clockOutStr}`);

      if (start.isValid() && end.isValid()) {
        const minutes = end.diff(start, "minute");
        const hours = minutes > 0 ? minutes / 60 : 0;

        // 시급 가져오기
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        let hourly = 10000;

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("hourly_wage")
            .eq("id", user.id)
            .single();
          if (profile?.hourly_wage) hourly = profile.hourly_wage;
        }

        const totalPay = hours > 0 ? Math.floor(hourly * hours) : 0;
        const incomeTax = totalPay > 0 ? Math.floor(totalPay * 0.03) : 0;
        const localTax = totalPay > 0 ? Math.floor(totalPay * 0.003) : 0;

        // 추가 공제 항목들 조회
        let additionalDeductions = 0;
        if (user) {
          const { data: deductions } = await supabase
            .from("salary_deductions")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_active", true);

          deductions?.forEach((deduction: any) => {
            if (deduction.type === "fixed") {
              // 일일 공제액 = 월 공제액 / 30일 (근사치, 소수점 버림)
              additionalDeductions += Math.floor(deduction.amount / 30);
            } else {
              additionalDeductions += Math.floor(
                (totalPay * deduction.amount) / 100
              );
            }
          });
        }

        const realPay =
          totalPay > 0
            ? Math.floor(
                totalPay - (incomeTax + localTax + additionalDeductions)
              )
            : 0;

        setDetail({
          ...found,
          hours,
          totalPay,
          incomeTax,
          localTax,
          additionalDeductions,
          realPay,
        });
      } else {
        console.error("Invalid time format:", found.clock_in, found.clock_out);
        setDetail(null);
      }
    } else {
      setDetail(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-indigo-100 rounded-full p-2">
          <svg
            className="w-6 h-6 text-indigo-600"
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
        </div>
        <h2 className="text-xl font-bold text-gray-800">근무 캘린더</h2>
      </div>

      <div className="calendar-container">
        <Calendar
          value={selectedMonth}
          onClickDay={handleDateClick}
          tileContent={tileContent}
          calendarType="gregory"
          minDetail="month"
          maxDetail="month"
          activeStartDate={selectedMonth}
          className="custom-calendar"
        />
      </div>

      {detail && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-blue-500 rounded-full p-1">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800">
              {dayjs(detail.date).format("YYYY년 MM월 DD일")} 근무 상세
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">근무 시간:</span>
                <span className="font-medium">
                  {detail.clock_in} ~ {detail.clock_out}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">총 시간:</span>
                <span className="font-medium">
                  {detail.hours.toFixed(1)}시간
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">총 급여:</span>
                <span className="font-medium">
                  {detail.totalPay.toLocaleString()}원
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">소득세:</span>
                <span>{detail.incomeTax.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">지방세:</span>
                <span>{detail.localTax.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">기타 공제:</span>
                <span>{detail.additionalDeductions.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200">
                <span className="font-medium text-gray-800">실지급액:</span>
                <span className="font-bold text-blue-600">
                  {detail.realPay.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .calendar-container :global(.custom-calendar) {
          width: 100%;
          border: none;
          font-family: inherit;
        }

        .calendar-container :global(.react-calendar__navigation) {
          display: flex;
          height: 44px;
          margin-bottom: 1rem;
        }

        .calendar-container :global(.react-calendar__navigation button) {
          min-width: 44px;
          background: none;
          border: none;
          font-size: 16px;
          font-weight: 500;
          color: #374151;
        }

        .calendar-container :global(.react-calendar__navigation button:hover) {
          background-color: #f3f4f6;
          border-radius: 6px;
        }

        .calendar-container :global(.react-calendar__month-view__weekdays) {
          text-align: center;
          text-transform: uppercase;
          font-weight: 600;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .calendar-container :global(.react-calendar__tile) {
          max-width: 100%;
          padding: 0.75rem 0.5rem;
          background: none;
          border: none;
          font-size: 0.875rem;
          border-radius: 6px;
          position: relative;
        }

        .calendar-container :global(.react-calendar__tile:hover) {
          background-color: #e0e7ff;
        }

        .calendar-container :global(.react-calendar__tile--active) {
          background-color: #3b82f6 !important;
          color: white;
        }

        .calendar-container :global(.react-calendar__tile--now) {
          background-color: #fef3c7;
          color: #92400e;
        }
      `}</style>
    </div>
  );
}
