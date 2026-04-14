"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

type PendingEmployee = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

type Props = {
  onClose: () => void;
  onUpdate?: () => void;
};

export default function ApprovalModal({ onClose, onUpdate }: Props) {
  const [pending, setPending] = useState<PendingEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    const supabase = createClient();
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("role", "employee")
      .eq("is_approved", false)
      .order("created_at", { ascending: true });

    setPending(data || []);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", id);

    if (error) {
      alert("승인 중 오류가 발생했습니다: " + error.message);
    } else {
      await fetchPending();
      onUpdate?.();
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    if (!confirm("이 계정을 거절하시겠습니까? 계정이 삭제됩니다.")) return;
    setProcessingId(id);
    const supabase = createClient();
    await supabase.from("profiles").delete().eq("id", id);
    await fetchPending();
    onUpdate?.();
    setProcessingId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">가입 승인 요청</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading ? "로딩 중..." : `대기 중 ${pending.length}명`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">대기 중인 가입 요청이 없습니다</p>
            </div>
          ) : (
            pending.map((emp) => (
              <div key={emp.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
                {/* 아바타 */}
                <div className="w-9 h-9 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-amber-700">
                    {emp.full_name?.charAt(0) || "?"}
                  </span>
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{emp.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{emp.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {dayjs(emp.created_at).format("MM/DD HH:mm")} 가입
                  </p>
                </div>

                {/* 버튼 */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(emp.id)}
                    disabled={processingId === emp.id}
                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {processingId === emp.id ? "..." : "승인"}
                  </button>
                  <button
                    onClick={() => handleReject(emp.id)}
                    disabled={processingId === emp.id}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 푸터 */}
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
