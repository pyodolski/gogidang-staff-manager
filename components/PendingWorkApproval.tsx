"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

type WorkLog = {
  id: number;
  user_id: string;
  date: string;
  clock_in: string;
  clock_out: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
};

export default function PendingWorkApproval() {
  const [pendingLogs, setPendingLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const fetchPendingLogs = async () => {
    const supabase = createClient();
    setLoading(true);

    const { data, error } = await supabase
      .from("work_logs")
      .select(
        `
        *,
        profiles (
          full_name,
          email
        )
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending logs:", error);
    } else {
      setPendingLogs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingLogs();
  }, []);

  const handleApproval = async (
    logId: number,
    newStatus: "approved" | "rejected"
  ) => {
    const supabase = createClient();
    setProcessingIds((prev) => new Set(prev).add(logId));

    const { error } = await supabase
      .from("work_logs")
      .update({ status: newStatus })
      .eq("id", logId);

    if (error) {
      console.error("Error updating status:", error);
      alert("상태 변경에 실패했습니다: " + error.message);
    } else {
      // 성공적으로 업데이트되면 목록에서 제거
      setPendingLogs((prev) => prev.filter((log) => log.id !== logId));
    }

    setProcessingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(logId);
      return newSet;
    });
  };

  const calculateWorkHours = (clockIn: string, clockOut: string) => {
    // 시간 문자열을 더 안전하게 파싱
    const clockInStr = clockIn.includes(":") ? clockIn : clockIn + ":00";
    const clockOutStr = clockOut.includes(":") ? clockOut : clockOut + ":00";

    // 오늘 날짜를 기준으로 시간 생성
    const baseDate = "2024-01-01";
    const start = dayjs(`${baseDate} ${clockInStr}`);
    const end = dayjs(`${baseDate} ${clockOutStr}`);

    if (start.isValid() && end.isValid()) {
      const minutes = end.diff(start, "minute");
      return minutes > 0 ? (minutes / 60).toFixed(2) : "0.00";
    }

    return "0.00";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (pendingLogs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-100 rounded-full p-2">
            <svg
              className="w-6 h-6 text-green-600"
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
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            승인 대기 근무 내역
          </h2>
        </div>

        <div className="text-center py-12">
          <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
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
          </div>
          <p className="text-gray-500 font-medium mb-2">
            모든 근무가 처리되었습니다!
          </p>
          <p className="text-gray-400 text-sm">
            승인 대기 중인 근무 내역이 없습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 rounded-full p-2">
            <svg
              className="w-6 h-6 text-orange-600"
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
            <h2 className="text-xl font-bold text-gray-800">
              승인 대기 근무 내역
            </h2>
            <p className="text-sm text-gray-600">
              {pendingLogs.length}건의 승인 대기 건이 있습니다
            </p>
          </div>
        </div>
        <button
          onClick={fetchPendingLogs}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          새로고침
        </button>
      </div>

      <div className="space-y-4">
        {pendingLogs.map((log) => (
          <div
            key={log.id}
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* 직원 정보 헤더 */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 rounded-full p-2">
                  <svg
                    className="w-5 h-5 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {log.profiles?.full_name || "이름 없음"}
                  </h3>
                  <p className="text-sm text-gray-600">{log.profiles?.email}</p>
                </div>
              </div>
              <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                승인 대기
              </div>
            </div>

            {/* 근무 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">근무일:</span>
                  <span className="font-medium">
                    {dayjs(log.date).format("YYYY년 MM월 DD일 (ddd)")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">근무시간:</span>
                  <span className="font-medium">
                    {log.clock_in} ~ {log.clock_out}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">총 시간:</span>
                  <span className="font-medium">
                    {calculateWorkHours(log.clock_in, log.clock_out)}시간
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">등록일:</span>
                  <span className="font-medium">
                    {dayjs(log.created_at).format("MM-DD HH:mm")}
                  </span>
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-3 pt-3 border-t border-yellow-200">
              <button
                onClick={() => handleApproval(log.id, "approved")}
                disabled={processingIds.has(log.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processingIds.has(log.id) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    처리중...
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    승인
                  </>
                )}
              </button>
              <button
                onClick={() => handleApproval(log.id, "rejected")}
                disabled={processingIds.has(log.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processingIds.has(log.id) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    처리중...
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    거절
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
