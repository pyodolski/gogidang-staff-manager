"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

type Announcement = {
  id: number;
  title: string;
  content: string;
  author_id: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
  };
};

type Props = {
  onClose: () => void;
};

export default function AnnouncementManager({ onClose }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);

  const fetchAnnouncements = async () => {
    const supabase = createClient();
    setLoading(true);

    const { data, error } = await supabase
      .from("announcements")
      .select(
        `
        *,
        profiles (
          full_name
        )
      `
      )
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching announcements:", error);
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    const supabase = createClient();

    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      alert("상태 변경에 실패했습니다: " + error.message);
    } else {
      fetchAnnouncements();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말로 이 공지사항을 삭제하시겠습니까?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      alert("삭제에 실패했습니다: " + error.message);
    } else {
      fetchAnnouncements();
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 3:
        return "긴급";
      case 2:
        return "중요";
      default:
        return "일반";
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3:
        return "bg-red-100 text-red-800";
      case 2:
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">공지사항 관리</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              새 공지 작성
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              닫기
            </button>
          </div>
        </div>

        {/* 공지사항 목록 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : announcements.length === 0 ? (
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
                    d="M15 17h5l-5 5v-5zM9 1H4a2 2 0 00-2 2v10a2 2 0 002 2h5m6 0a2 2 0 002-2V3a2 2 0 00-2-2h-6m0 0v20"
                  />
                </svg>
              </div>
              <p className="text-gray-500">등록된 공지사항이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`border rounded-lg p-4 ${
                    announcement.is_active
                      ? "bg-white"
                      : "bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                            announcement.priority
                          )}`}
                        >
                          {getPriorityText(announcement.priority)}
                        </span>
                        {!announcement.is_active && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            비활성
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-2">
                        {announcement.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {announcement.content}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <button
                        onClick={() => setEditingAnnouncement(announcement)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
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
                        onClick={() =>
                          handleToggleActive(
                            announcement.id,
                            announcement.is_active
                          )
                        }
                        className={`p-2 rounded ${
                          announcement.is_active
                            ? "text-orange-600 hover:bg-orange-50"
                            : "text-green-600 hover:bg-green-50"
                        }`}
                        title={announcement.is_active ? "비활성화" : "활성화"}
                      >
                        {announcement.is_active ? (
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
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                            />
                          </svg>
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="삭제"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    작성자: {announcement.profiles?.full_name} | 작성일:{" "}
                    {dayjs(announcement.created_at).format("YYYY-MM-DD HH:mm")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 공지 작성/수정 모달 */}
      {(showCreateModal || editingAnnouncement) && (
        <AnnouncementModal
          announcement={editingAnnouncement}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAnnouncement(null);
          }}
          onSave={() => {
            fetchAnnouncements();
            setShowCreateModal(false);
            setEditingAnnouncement(null);
          }}
        />
      )}
    </div>
  );
}

// 공지 작성/수정 모달
function AnnouncementModal({
  announcement,
  onClose,
  onSave,
}: {
  announcement?: Announcement | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [title, setTitle] = useState(announcement?.title || "");
  const [content, setContent] = useState(announcement?.content || "");
  const [priority, setPriority] = useState(announcement?.priority || 1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      const announcementData = {
        title: title.trim(),
        content: content.trim(),
        priority,
        author_id: user.id,
      };

      let result;
      if (announcement) {
        result = await supabase
          .from("announcements")
          .update(announcementData)
          .eq("id", announcement.id);
      } else {
        result = await supabase.from("announcements").insert(announcementData);
      }

      if (result.error) throw result.error;
      onSave();
    } catch (error: any) {
      alert("저장에 실패했습니다: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold">
            {announcement ? "공지사항 수정" : "새 공지사항 작성"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              우선순위
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>일반</option>
              <option value={2}>중요</option>
              <option value={3}>긴급</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지사항 제목을 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지사항 내용을 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={8}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "저장 중..." : announcement ? "수정" : "작성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
