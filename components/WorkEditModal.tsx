"use client";
import { useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

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

type Props = {
  workLog: WorkLog;
  onClose: () => void;
  onSave: () => void;
};

export default function WorkEditModal({ workLog, onClose, onSave }: Props) {
  const [date, setDate] = useState(workLog.date);
  const [workType, setWorkType] = useState(workLog.work_type || "work");
  const [clockIn, setClockIn] = useState(
    workLog.clock_in ? workLog.clock_in.substring(0, 5) : "09:00"
  );
  const [clockOut, setClockOut] = useState(
    workLog.clock_out ? workLog.clock_out.substring(0, 5) : "18:00"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateWarning, setDateWarning] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    try {
      // 날짜가 변경된 경우에만 중복 검증
      if (date !== workLog.date) {
        const { data: existingLog, error: checkError } = await supabase
          .from("work_logs")
          .select("id, work_type")
          .eq("user_id", workLog.user_id)
          .eq("date", date)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          setError("기록 확인 중 오류가 발생했습니다: " + checkError.message);
          setLoading(false);
          return;
        }

        if (existingLog) {
          const existingType =
            existingLog.work_type === "day_off" ? "휴무" : "근무";
          setError(
            `${date}에 이미 ${existingType} 기록이 존재합니다. 하루에 하나의 기록만 등록할 수 있습니다.`
          );
          setLoading(false);
          return;
        }
      }

      const workData: any = {
        date,
        work_type: workType,
        status: "pending", // 수정 시 다시 승인 대기 상태로
      };

      // 휴무가 아닌 경우에만 시간 정보 추가
      if (workType !== "day_off") {
        workData.clock_in = clockIn + ":00";
        workData.clock_out = clockOut + ":00";
      } else {
        workData.clock_in = null;
        workData.clock_out = null;
      }

      const { error } = await supabase
        .from("work_logs")
        .update(workData)
        .eq("id", workLog.id);

      if (error) {
        // 중복 제약조건 에러 처리
        if (
          error.code === "23505" &&
          error.message.includes("work_logs_user_date_unique")
        ) {
          setError(
            `${date}에 이미 근무 기록이 존재합니다. 하루에 하나의 기록만 등록할 수 있습니다.`
          );
        } else if (error.message.includes("이미 근무 기록이 존재합니다")) {
          setError(error.message);
        } else {
          setError("수정 실패: " + error.message);
        }
      } else {
        onSave();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkHours = () => {
    if (workType === "day_off") {
      return "휴무";
    }

    const start = dayjs(`2024-01-01 ${clockIn}:00`);
    const end = dayjs(`2024-01-01 ${clockOut}:00`);

    if (start.isValid() && end.isValid() && end.isAfter(start)) {
      const minutes = end.diff(start, "minute");
      return (minutes / 60).toFixed(1) + "시간";
    }
    return "0.0시간";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            근무 기록 수정
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>기존 기록:</strong>{" "}
            {dayjs(workLog.date).format("YYYY년 MM월 DD일")}
            {workLog.work_type === "day_off"
              ? " (휴무)"
              : ` (${workLog.clock_in} ~ ${workLog.clock_out})`}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              날짜
            </label>
            <input
              type="date"
              value={date}
              onChange={async (e) => {
                const selectedDate = e.target.value;
                setDate(selectedDate);
                setDateWarning("");

                // 날짜가 변경된 경우에만 중복 확인
                if (selectedDate !== workLog.date) {
                  const supabase = createClient();
                  const { data: existingLog } = await supabase
                    .from("work_logs")
                    .select("work_type")
                    .eq("user_id", workLog.user_id)
                    .eq("date", selectedDate)
                    .single();

                  if (existingLog) {
                    const existingType =
                      existingLog.work_type === "day_off" ? "휴무" : "근무";
                    setDateWarning(
                      `이 날짜에 이미 ${existingType} 기록이 있습니다.`
                    );
                  }
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {dateWarning && (
              <div className="text-yellow-600 text-sm mt-1 flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {dateWarning}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              유형
            </label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="work">근무</option>
              <option value="day_off">휴무 신청</option>
            </select>
          </div>

          {workType === "work" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  출근시간
                </label>
                <input
                  type="time"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  퇴근시간
                </label>
                <input
                  type="time"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          )}

          {workType === "day_off" && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-yellow-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                <span className="text-sm text-yellow-800">
                  휴무 신청입니다. 관리자 승인 후 적용됩니다.
                </span>
              </div>
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              {workType === "work" ? (
                <>
                  예상 근무시간: <strong>{calculateWorkHours()}</strong>
                </>
              ) : (
                <>
                  유형: <strong className="text-yellow-600">휴무</strong>
                </>
              )}
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>알림:</strong> 수정 후 다시 승인 대기 상태가 됩니다.
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "수정 중..." : "수정"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
