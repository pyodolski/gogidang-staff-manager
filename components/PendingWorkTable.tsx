import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";
import WorkEditModal from "./WorkEditModal";
import { formatWorkHours, isNightShift } from "../lib/timeUtils";

export default function PendingWorkTable() {
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchWorkLogs = async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      let query = supabase
        .from("work_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching work logs:", error);
        setWorkLogs([]);
      } else {
        setWorkLogs(data || []);
      }
    } catch (err) {
      console.error("Database query error:", err);
      setWorkLogs([]);
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말로 이 근무 기록을 삭제하시겠습니까?")) {
      return;
    }

    setDeletingId(id);
    const supabase = createClient();

    try {
      const { error } = await supabase.from("work_logs").delete().eq("id", id);

      if (error) {
        alert("삭제 실패: " + error.message);
      } else {
        fetchWorkLogs(); // 목록 새로고침
      }
    } catch (err: any) {
      alert("삭제 중 오류가 발생했습니다: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSave = () => {
    setEditingLog(null);
    fetchWorkLogs(); // 목록 새로고침
  };

  useEffect(() => {
    fetchWorkLogs();
  }, [filter]);

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "대기중";
      case "approved":
        return "승인됨";
      case "rejected":
        return "거절됨";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = workLogs.filter(
    (log) => log.status === "pending"
  ).length;
  const approvedCount = workLogs.filter(
    (log) => log.status === "approved"
  ).length;
  const rejectedCount = workLogs.filter(
    (log) => log.status === "rejected"
  ).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 rounded-full p-2">
            <svg
              className="w-6 h-6 text-slate-600"
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
          <h2 className="text-xl font-bold text-gray-800">근무 등록 내역</h2>
        </div>
        <button
          onClick={fetchWorkLogs}
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

      {/* 상태별 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">전체</div>
          <div className="text-lg font-semibold text-gray-800">
            {workLogs.length}건
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3">
          <div className="text-xs text-yellow-700 mb-1">대기중</div>
          <div className="text-lg font-semibold text-yellow-800">
            {pendingCount}건
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-xs text-green-700 mb-1">승인됨</div>
          <div className="text-lg font-semibold text-green-800">
            {approvedCount}건
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <div className="text-xs text-red-700 mb-1">거절됨</div>
          <div className="text-lg font-semibold text-red-800">
            {rejectedCount}건
          </div>
        </div>
      </div>

      {/* 필터 버튼들 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
            filter === "all"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
            filter === "pending"
              ? "bg-yellow-500 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          대기중
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
            filter === "approved"
              ? "bg-green-500 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          승인됨
        </button>
        <button
          onClick={() => setFilter("rejected")}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
            filter === "rejected"
              ? "bg-red-500 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          거절됨
        </button>
      </div>

      {workLogs.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
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
          <p className="text-gray-500 font-medium">
            {filter === "all"
              ? "등록된 근무 내역이 없습니다."
              : `${getStatusText(filter)} 근무 내역이 없습니다.`}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {filter === "pending"
              ? "승인 대기 중인 근무 기록이 없습니다."
              : "근무 등록 버튼을 눌러 새로운 근무를 등록해보세요."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {workLogs.map((log) => {
            const statusConfig = {
              pending: {
                bg: "bg-yellow-50",
                border: "border-yellow-200",
                text: "text-yellow-800",
                badge: "bg-yellow-100",
              },
              approved: {
                bg: "bg-green-50",
                border: "border-green-200",
                text: "text-green-800",
                badge: "bg-green-100",
              },
              rejected: {
                bg: "bg-red-50",
                border: "border-red-200",
                text: "text-red-800",
                badge: "bg-red-100",
              },
            }[log.status] || {
              bg: "bg-gray-50",
              border: "border-gray-200",
              text: "text-gray-800",
              badge: "bg-gray-100",
            };

            return (
              <div
                key={log.id}
                className={`${statusConfig.bg} ${statusConfig.border} border rounded-lg p-4 hover:shadow-md transition-shadow`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {dayjs(log.date).format("YYYY년 MM월 DD일 (ddd)")}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {(log.work_type || "work") === "day_off" ? (
                        <div>
                          <span className="text-yellow-600">휴무일</span>
                          {log.day_off_reason && (
                            <div className="text-xs text-gray-500 mt-1 bg-gray-50 px-2 py-1 rounded">
                              사유: {log.day_off_reason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {log.clock_in} ~ {log.clock_out}
                          {isNightShift(log.clock_in, log.clock_out) && (
                            <span className="text-xs text-purple-600 ml-1">
                              (야간)
                            </span>
                          )}
                          <br />
                          <span className="text-xs text-gray-500">
                            (
                            {formatWorkHours(
                              log.clock_in,
                              log.clock_out,
                              log.work_type
                            )}
                            시간)
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className={`${statusConfig.badge} ${statusConfig.text} px-3 py-1 rounded-full text-xs font-medium`}
                  >
                    {getStatusText(log.status)}
                  </span>
                </div>

                {/* 거절 사유 표시 */}
                {log.status === "rejected" && log.rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-red-800 mb-1">
                          거절 사유
                        </div>
                        <div className="text-sm text-red-700">
                          {log.rejection_reason}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    등록일: {dayjs(log.created_at).format("MM-DD HH:mm")}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 상태 표시 */}
                    {log.status === "pending" && (
                      <div className="flex items-center gap-1 text-yellow-600">
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
                        <span className="text-xs">승인 대기중</span>
                      </div>
                    )}
                    {log.status === "approved" && (
                      <div className="flex items-center gap-1 text-green-600">
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
                        <span className="text-xs">승인 완료</span>
                      </div>
                    )}
                    {log.status === "rejected" && (
                      <div className="flex items-center gap-1 text-red-600">
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
                        <span className="text-xs">승인 거절</span>
                      </div>
                    )}

                    {/* 승인된 기록에 대한 안내 */}
                    {log.status === "approved" && (
                      <div className="text-xs text-gray-500">
                        승인된 기록은 수정할 수 없습니다
                      </div>
                    )}

                    {/* 거절된 기록에 대한 안내 */}
                    {log.status === "rejected" && (
                      <div className="text-xs text-gray-500">
                        거절된 기록입니다
                      </div>
                    )}

                    {/* 수정/삭제 버튼 (미승인 상태에서만 표시) */}
                    {log.status === "pending" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingLog(log)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="수정"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          disabled={deletingId === log.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="삭제"
                        >
                          {deletingId === log.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 수정 모달 */}
      {editingLog && (
        <WorkEditModal
          workLog={editingLog}
          onClose={() => setEditingLog(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
