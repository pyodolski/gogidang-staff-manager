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
      // 성공적으로 업데이트되면 목록에서 제거
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
      // 성공적으로 업데이트되면 목록에서 제거
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
        {pendingLogs.map((log) => {
          const isOffDay = log.work_type === "day_off";

          return (
            <div
              key={log.id}
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                isOffDay
                  ? "bg-blue-50 border-blue-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              {/* 직원 정보 헤더 */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-full p-2 ${
                      isOffDay ? "bg-blue-100" : "bg-yellow-100"
                    }`}
                  >
                    {isOffDay ? (
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    ) : (
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
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {log.profiles?.full_name || "이름 없음"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {log.profiles?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOffDay && (
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                      휴무 신청
                    </div>
                  )}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      isOffDay
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    승인 대기
                  </div>
                </div>
              </div>

              {/* 근무 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">날짜:</span>
                    <span className="font-medium">
                      {dayjs(log.date).format("YYYY년 MM월 DD일 (ddd)")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">
                      {isOffDay ? "유형:" : "근무시간:"}
                    </span>
                    <span className="font-medium">
                      {isOffDay ? (
                        <span className="text-blue-600">휴무</span>
                      ) : (
                        `${log.clock_in} ~ ${log.clock_out}`
                      )}
                    </span>
                  </div>
                  {/* 휴무 사유 표시 */}
                  {isOffDay && log.day_off_reason && (
                    <div className="col-span-2">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <svg
                            className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                          </svg>
                          <div>
                            <div className="text-sm font-medium text-blue-800 mb-1">
                              휴무 사유
                            </div>
                            <div className="text-sm text-blue-700">
                              {log.day_off_reason}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">
                      {isOffDay ? "상태:" : "총 시간:"}
                    </span>
                    <span className="font-medium">
                      {isOffDay ? (
                        <span className="text-blue-600">휴무일</span>
                      ) : (
                        `${formatWorkHours(
                          log.clock_in,
                          log.clock_out,
                          log.work_type
                        )}시간`
                      )}
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
                  onClick={() => handleApproval(log.id)}
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
                  onClick={() => handleRejectClick(log)}
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
          );
        })}
      </div>

      {/* 거절 사유 입력 모달 */}
      {showRejectModal && selectedLogForReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 rounded-full p-2">
                <svg
                  className="w-6 h-6 text-red-600"
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
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  근무 거절
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedLogForReject.profiles?.full_name} -{" "}
                  {dayjs(selectedLogForReject.date).format("MM/DD")}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                거절 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="거절 사유를 입력해주세요. (예: 출근 시간이 잘못되었습니다, 휴무일과 겹칩니다 등)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {rejectionReason.length}/500자
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedLogForReject(null);
                  setRejectionReason("");
                }}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={
                  !rejectionReason.trim() ||
                  processingIds.has(selectedLogForReject.id)
                }
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
