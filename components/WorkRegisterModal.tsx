import { useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

type Props = {
  onClose: () => void;
  onSuccess?: () => void;
};

export default function WorkRegisterModal({ onClose, onSuccess }: Props) {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [workType, setWorkType] = useState("work");
  const [clockIn, setClockIn] = useState("09:00");
  const [clockOut, setClockOut] = useState("18:00");
  const [dayOffReason, setDayOffReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dateWarning, setDateWarning] = useState("");
  const [showSuccessOptions, setShowSuccessOptions] = useState(false);

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
        `${date}에 이미 ${existingType} 기록이 존재합니다. 하루에 하나의 기록만 등록할 수 있습니다.`,
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
          `${date}에 이미 근무 기록이 존재합니다. 하루에 하나의 기록만 등록할 수 있습니다.`,
        );
      } else if (error.message.includes("이미 근무 기록이 존재합니다")) {
        setError(error.message);
      } else {
        setError("등록 실패: " + error.message);
      }
    } else {
      setSuccess(true);
      setShowSuccessOptions(true);
      if (onSuccess) {
        onSuccess();
      }
    }
    setLoading(false);
  };

  const handleContinueRegistration = () => {
    // 폼 초기화
    setDate(dayjs().format("YYYY-MM-DD"));
    setWorkType("work");
    setClockIn("09:00");
    setClockOut("18:00");
    setDayOffReason("");
    setError("");
    setSuccess(false);
    setShowSuccessOptions(false);
    setDateWarning("");
  };

  const handleCloseAfterSuccess = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-cyan-600 p-5 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                근무 등록
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                근무 시간을 등록하세요
              </p>
            </div>
            <button
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
              onClick={onClose}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                      `이 날짜에 이미 ${existingType} 기록이 있습니다.`,
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
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
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
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              유형
            </label>
            <select
              value={workType}
              onChange={(e) => {
                setWorkType(e.target.value);
                setError("");
              }}
              className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              disabled={loading}
            >
              <option value="work">근무</option>
              <option value="day_off">휴무 신청</option>
            </select>
          </div>
          {workType === "work" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  출근 시간
                </label>
                <input
                  type="time"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                  className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  퇴근 시간
                </label>
                <input
                  type="time"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                  className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </>
          )}
          {workType === "day_off" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  휴무 사유
                </label>
                <textarea
                  value={dayOffReason}
                  onChange={(e) => setDayOffReason(e.target.value)}
                  placeholder="휴무 사유를 입력해주세요 (예: 개인 사정, 병가, 연차 등)"
                  className="border-2 border-gray-200 rounded-xl px-4 py-3 w-full h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  maxLength={200}
                  disabled={loading}
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {dayOffReason.length}/200자
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                  <span className="text-sm text-yellow-800 font-medium">
                    휴무 신청입니다. 관리자 승인 후 적용됩니다.
                  </span>
                </div>
              </div>
            </>
          )}
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <span className="text-sm text-red-800 font-medium">
                  {error}
                </span>
              </div>
            </div>
          )}

          {success && !showSuccessOptions && (
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span className="text-sm text-green-800 font-semibold">
                  등록 완료!
                </span>
              </div>
            </div>
          )}

          {showSuccessOptions ? (
            <div className="space-y-3 pt-2">
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl mb-4">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <div>
                    <p className="text-green-800 font-bold">등록 완료!</p>
                    <p className="text-green-700 text-sm">
                      근무가 성공적으로 등록되었습니다
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleContinueRegistration}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:shadow-lg font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                계속 등록하기
              </button>
              <button
                type="button"
                onClick={handleCloseAfterSuccess}
                className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all"
              >
                닫기
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:shadow-lg font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  등록 중...
                </>
              ) : (
                <>
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  등록하기
                </>
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
