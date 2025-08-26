import { useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

type Props = {
  onClose: () => void;
};

export default function WorkRegisterModal({ onClose }: Props) {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [workType, setWorkType] = useState("work");
  const [clockIn, setClockIn] = useState("09:00");
  const [clockOut, setClockOut] = useState("18:00");
  const [dayOffReason, setDayOffReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dateWarning, setDateWarning] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("로그인이 필요합니다.");
      setLoading(false);
      return;
    }

    // 중복 검증: 같은 날짜에 이미 기록이 있는지 확인
    const { data: existingLog, error: checkError } = await supabase
      .from("work_logs")
      .select("id, work_type")
      .eq("user_id", user.id)
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
    // 프로필 존재 확인 및 생성
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      // 프로필이 없으면 생성
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        role: "employee",
        hourly_wage: 10000,
      });

      if (profileError) {
        setError("프로필 생성 실패: " + profileError.message);
        setLoading(false);
        return;
      }
    }

    const workData: any = {
      user_id: user.id,
      date,
      work_type: workType,
      status: "pending",
    };

    // 휴무가 아닌 경우에만 시간 정보 추가
    if (workType !== "day_off") {
      workData.clock_in = clockIn + ":00";
      workData.clock_out = clockOut + ":00";
      workData.day_off_reason = null;
    } else {
      workData.clock_in = null;
      workData.clock_out = null;
      workData.day_off_reason = dayOffReason.trim() || "사유 미입력";
    }

    const { error } = await supabase.from("work_logs").insert(workData);

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
        setError("등록 실패: " + error.message);
      }
    } else {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow p-6 w-full max-w-sm relative">
        <button
          className="absolute top-2 right-2 text-gray-400"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4">근무 등록</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={async (e) => {
                const selectedDate = e.target.value;
                setDate(selectedDate);
                setDateWarning("");

                // 선택한 날짜에 이미 기록이 있는지 확인
                const supabase = createClient();
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (user) {
                  const { data: existingLog } = await supabase
                    .from("work_logs")
                    .select("work_type")
                    .eq("user_id", user.id)
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
              className="border rounded px-2 py-1 w-full"
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
            <label className="block mb-1">유형</label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="work">근무</option>
              <option value="day_off">휴무 신청</option>
            </select>
          </div>
          {workType === "work" && (
            <>
              <div>
                <label className="block mb-1">출근 시간</label>
                <input
                  type="time"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                  required
                />
              </div>
              <div>
                <label className="block mb-1">퇴근 시간</label>
                <input
                  type="time"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                  required
                />
              </div>
            </>
          )}
          {workType === "day_off" && (
            <>
              <div>
                <label className="block mb-1">휴무 사유</label>
                <textarea
                  value={dayOffReason}
                  onChange={(e) => setDayOffReason(e.target.value)}
                  placeholder="휴무 사유를 입력해주세요 (예: 개인 사정, 병가, 연차 등)"
                  className="border rounded px-2 py-1 w-full h-20 resize-none"
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {dayOffReason.length}/200자
                </div>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
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
            </>
          )}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">등록 완료!</div>}
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
            disabled={loading}
          >
            {loading ? "등록 중..." : "등록"}
          </button>
        </form>
      </div>
    </div>
  );
}
