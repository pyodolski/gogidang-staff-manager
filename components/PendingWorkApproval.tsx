"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";
import { formatWorkHours } from "../lib/timeUtils";

type WorkLog = {
  id: number;
  user_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
  work_type?: string;
  day_off_reason?: string;
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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLogForReject, setSelectedLogForReject] =
    useState<WorkLog | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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

  const handleApproval = async (logId: number) => {
    const supabase = createClient();
    setProcessingIds((prev) => new Set(prev).add(logId));

    const { error } = await supabase
      .from("work_logs")
      .update({ status: "approved" })
      .eq("id", logId);

    if (error) {
      console.error("Error updating status:", error);
      alert("상태 변경에 실패했습니다: " + error.message);
    } else {
      setPendingLogs((prev) => prev.filter((log) => log.id !== logId));
    }

    setProcessingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(logId);
      return newSet;
    });
  };

  const handleRejectClick = (log: WorkLog) => {
    setSelectedLogForReject(log);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedLogForReject || !rejectionReason.trim()) {
      alert("거절 사유를 입력해주세요.");
      return;
    }

    const supabase = createClient();
    setProcessingIds((prev) => new Set(prev).add(selectedLogForReject.id));

    const { error } = await supabase
      .from("work_logs")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason.trim(),
      })
      .eq("id", selectedLogForReject.id);

    if (error) {
      console.error("Error updating status:", error);
      alert("상태 변경에 실패했습니다: " + error.message);
    } else {
      setPendingLogs((prev) =>
        prev.filter((log) => log.id !== selectedLogForReject.id)
      );
      setShowRejectModal(false);
      setSelectedLogForReject(null);
      setRejectionReason("");
    }

    setProcessingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(selectedLogForReject.id);
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (pendingLogs.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-8">
        <div className="text-center py-12">
          <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg
              className="w-10 h-10 text-green-600"
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
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            모든 근무가 처리되었습니다!
          </h3>
          <p className="text-gray-500">승인 대기 중인 근무 내역이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-3 shadow-lg">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                승인 대기 목록
              </h2>
              <p className="text-sm text-gray-600">
                {pendingLogs.length}건의 승인 대기 건
              </p>
            </div>
          </div>
          <button
            onClick={fetchPendingLogs}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all hover:scale-105"
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
            <span className="hidden sm:inline">새로고침</span>
          </button>
        </div>
      </div>

      {/* 승인 대기 카드들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pendingLogs.map((log) => {
          const isOffDay = log.work_type === "day_off";

          return (
            <div
              key={log.id}
              className={`group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl hover:scale-[1.02] ${
                isOffDay
                  ? "border-blue-200 hover:border-blue-300"
                  : "border-amber-200 hover:border-amber-300"
              }`}
            >
              {/* 카드 헤더 */}
              <div
                className={`p-4 rounded-t-2xl ${
                  isOffDay
                    ? "bg-gradient-to-r from-blue-50 to-cyan-50"
                    : "bg-gradient-to-r from-amber-50 to-orange-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-xl p-2.5 shadow-md ${
                        isOffDay
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                          : "bg-gradient-to-br from-amber-500 to-orange-500"
                      }`}
                    >
                      {isOffDay ? (
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">
                        {log.profiles?.full_name || "이름 없음"}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {log.profiles?.email}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                      isOffDay
                        ? "bg-blue-500 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {isOffDay ? "휴무" : "근무"}
                  </div>
                </div>
              </div>

              {/* 카드 본문 */}
              <div className="p-4 space-y-3">
                {/* 날짜 */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                  <svg
                    className="w-5 h-5 text-gray-600"
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
                  <span className="font-semibold text-gray-800">
                    {dayjs(log.date).format("YYYY년 MM월 DD일 (ddd)")}
                  </span>
                </div>

                {/* 근무 시간 또는 휴무 정보 */}
                {isOffDay ? (
                  <>
                    <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-3">
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
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                      </svg>
                      <span className="font-semibold text-blue-700">
                        휴무일
                      </span>
                    </div>
                    {log.day_off_reason && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-3">
                        <div className="text-xs text-blue-600 font-medium mb-1">
                          휴무 사유
                        </div>
                        <div className="text-sm text-blue-800">
                          {log.day_off_reason}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-green-50 rounded-xl p-3">
                        <div className="text-xs text-green-600 font-medium mb-1">
                          출근
                        </div>
                        <div className="text-lg font-bold text-green-700">
                          {log.clock_in}
                        </div>
                      </div>
                      <div className="bg-red-50 rounded-xl p-3">
                        <div className="text-xs text-red-600 font-medium mb-1">
                          퇴근
                        </div>
                        <div className="text-lg font-bold text-red-700">
                          {log.clock_out}
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-sm text-purple-600 font-medium">
                        총 근무시간
                      </span>
                      <span className="text-lg font-bold text-purple-700">
                        {formatWorkHours(
                          log.clock_in,
                          log.clock_out,
                          log.work_type
                        )}
                        시간
                      </span>
                    </div>
                  </>
                )}

                {/* 등록 시간 */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    등록: {dayjs(log.created_at).format("MM-DD HH:mm")}
                  </span>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="p-4 pt-0 flex gap-2">
                <button
                  onClick={() => handleApproval(log.id)}
                  disabled={processingIds.has(log.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 font-semibold"
                >
                  {processingIds.has(log.id) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      처리중
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
                      승인
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleRejectClick(log)}
                  disabled={processingIds.has(log.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 font-semibold"
                >
                  {processingIds.has(log.id) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      처리중
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      거절
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 거절 사유 입력 모달 */}
      {showRejectModal && selectedLogForReject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
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
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">근무 거절</h3>
                  <p className="text-sm text-white/80">
                    {selectedLogForReject.profiles?.full_name} -{" "}
                    {dayjs(selectedLogForReject.date).format("MM/DD")}
                  </p>
                </div>
              </div>
            </div>

            {/* 모달 본문 */}
            <div className="p-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                거절 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="거절 사유를 입력해주세요.&#10;예: 출근 시간이 잘못되었습니다, 휴무일과 겹칩니다 등"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none transition-all"
                rows={5}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-500">
                  {rejectionReason.length}/500자
                </div>
                {rejectionReason.trim() && (
                  <div className="text-xs text-green-600 font-medium">
                    ✓ 입력 완료
                  </div>
                )}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedLogForReject(null);
                  setRejectionReason("");
                }}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all font-semibold"
              >
                취소
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={
                  !rejectionReason.trim() ||
                  processingIds.has(selectedLogForReject.id)
                }
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
              >
                {processingIds.has(selectedLogForReject.id) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                    처리중...
                  </>
                ) : (
                  "거절하기"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
