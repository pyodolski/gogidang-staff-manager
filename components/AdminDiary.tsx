"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

type DiaryEntry = {
  id: number;
  admin_id: string;
  diary_date: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
  };
};

export default function AdminDiary() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    dayjs().format("YYYY-MM-DD")
  );
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [currentEntry, setCurrentEntry] = useState<DiaryEntry | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    const supabase = createClient();
    setLoading(true);

    const startDate = dayjs(selectedMonth + "-01")
      .startOf("month")
      .format("YYYY-MM-DD");
    const endDate = dayjs(selectedMonth + "-01")
      .endOf("month")
      .format("YYYY-MM-DD");

    const { data, error } = await supabase
      .from("admin_diary")
      .select(
        `
        *,
        profiles (
          full_name
        )
      `
      )
      .gte("diary_date", startDate)
      .lte("diary_date", endDate)
      .order("diary_date", { ascending: false });

    if (error) {
      console.error("Error fetching diary entries:", error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const fetchEntryByDate = async (date: string) => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("admin_diary")
      .select(
        `
        *,
        profiles (
          full_name
        )
      `
      )
      .eq("diary_date", date)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching diary entry:", error);
      return null;
    }

    return data;
  };

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date);
    const entry = await fetchEntryByDate(date);

    if (entry) {
      setCurrentEntry(entry);
      setTitle(entry.title || "");
      setContent(entry.content);
    } else {
      setCurrentEntry(null);
      setTitle("");
      setContent("");
    }
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      const diaryData = {
        admin_id: user.id,
        diary_date: selectedDate,
        title: title.trim() || null,
        content: content.trim(),
      };

      let result;
      if (currentEntry) {
        // 수정
        result = await supabase
          .from("admin_diary")
          .update(diaryData)
          .eq("id", currentEntry.id);
      } else {
        // 새로 작성
        result = await supabase.from("admin_diary").insert(diaryData);
      }

      if (result.error) throw result.error;

      alert("저장되었습니다.");
      setShowEditor(false);
      fetchEntries();
    } catch (error: any) {
      alert("저장에 실패했습니다: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말로 이 다이어리를 삭제하시겠습니까?")) return;

    const supabase = createClient();

    const { error } = await supabase.from("admin_diary").delete().eq("id", id);

    if (error) {
      alert("삭제에 실패했습니다: " + error.message);
    } else {
      fetchEntries();
      if (currentEntry?.id === id) {
        setShowEditor(false);
      }
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedMonth]);

  // 캘린더 날짜 생성
  const generateCalendarDays = () => {
    const firstDay = dayjs(selectedMonth + "-01").startOf("month");
    const lastDay = dayjs(selectedMonth + "-01").endOf("month");
    const startDate = firstDay.startOf("week");
    const endDate = lastDay.endOf("week");

    const days = [];
    let currentDate = startDate;

    while (
      currentDate.isBefore(endDate) ||
      currentDate.isSame(endDate, "day")
    ) {
      days.push(currentDate);
      currentDate = currentDate.add(1, "day");
    }

    return days;
  };

  // 해당 날짜에 다이어리가 있는지 확인
  const hasDiary = (date: dayjs.Dayjs) => {
    return entries.some((entry) => dayjs(entry.diary_date).isSame(date, "day"));
  };

  // 해당 날짜의 다이어리 가져오기
  const getDiaryForDate = (date: dayjs.Dayjs) => {
    return entries.find((entry) => dayjs(entry.diary_date).isSame(date, "day"));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-800">
                관리자 다이어리
              </h2>
              <p className="text-xs md:text-sm text-gray-600 hidden sm:block">
                날짜별 메모와 기록을 관리하세요
              </p>
            </div>
          </div>
          {/* 데스크톱: 텍스트 버튼 */}
          <button
            onClick={() => handleDateSelect(dayjs().format("YYYY-MM-DD"))}
            className="hidden md:flex px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            오늘 작성
          </button>
          {/* 모바일: 아이콘 버튼 */}
          <button
            onClick={() => handleDateSelect(dayjs().format("YYYY-MM-DD"))}
            className="md:hidden p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            title="오늘 작성"
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
          </button>
        </div>
      </div>

      {/* 월 선택 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
            조회 월:
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 sm:flex-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <span className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
          {entries.length}개의 다이어리
        </span>
      </div>

      {/* 캘린더 */}
      <div className="bg-gray-50 rounded-lg p-2 sm:p-4 mb-6">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* 요일 헤더 */}
          {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => (
            <div
              key={day}
              className={`text-center text-xs sm:text-sm font-semibold py-1 sm:py-2 ${
                index === 0
                  ? "text-red-600"
                  : index === 6
                  ? "text-blue-600"
                  : "text-gray-700"
              }`}
            >
              {day}
            </div>
          ))}

          {/* 날짜 */}
          {generateCalendarDays().map((date, index) => {
            const isCurrentMonth = date.format("YYYY-MM") === selectedMonth;
            const isToday = date.isSame(dayjs(), "day");
            const hasDiaryEntry = hasDiary(date);
            const diary = getDiaryForDate(date);
            const isSelected = date.format("YYYY-MM-DD") === selectedDate;

            return (
              <button
                key={index}
                onClick={() => handleDateSelect(date.format("YYYY-MM-DD"))}
                disabled={!isCurrentMonth}
                className={`
                  relative aspect-square p-1 sm:p-2 rounded-md sm:rounded-lg text-xs sm:text-sm transition-all touch-manipulation
                  ${!isCurrentMonth ? "text-gray-300 cursor-not-allowed" : ""}
                  ${
                    isCurrentMonth && !hasDiaryEntry
                      ? "hover:bg-gray-200 active:bg-gray-300"
                      : ""
                  }
                  ${
                    hasDiaryEntry
                      ? "bg-indigo-100 hover:bg-indigo-200 active:bg-indigo-300 font-semibold text-indigo-700"
                      : ""
                  }
                  ${isToday ? "ring-1 sm:ring-2 ring-indigo-500" : ""}
                  ${
                    isSelected
                      ? "ring-1 sm:ring-2 ring-indigo-600 bg-indigo-200"
                      : ""
                  }
                  ${index % 7 === 0 && isCurrentMonth ? "text-red-600" : ""}
                  ${index % 7 === 6 && isCurrentMonth ? "text-blue-600" : ""}
                `}
                title={
                  diary
                    ? `${diary.title || "제목 없음"}\n${diary.content.substring(
                        0,
                        50
                      )}...`
                    : ""
                }
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span>{date.format("D")}</span>
                  {hasDiaryEntry && (
                    <div className="absolute bottom-0.5 sm:bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 mt-3 sm:mt-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-indigo-100 rounded"></div>
            <span className="text-xs">다이어리 있음</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-indigo-500 rounded"></div>
            <span className="text-xs">오늘</span>
          </div>
        </div>
      </div>

      {/* 다이어리 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <p className="text-gray-500 font-medium mb-2">
            작성된 다이어리가 없습니다
          </p>
          <p className="text-gray-400 text-sm">
            오늘 작성 버튼을 눌러 첫 다이어리를 작성해보세요
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleDateSelect(entry.diary_date)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-indigo-600">
                      {dayjs(entry.diary_date).format("YYYY년 MM월 DD일 (ddd)")}
                    </span>
                    {dayjs(entry.diary_date).isSame(dayjs(), "day") && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        오늘
                      </span>
                    )}
                  </div>
                  {entry.title && (
                    <h3 className="font-semibold text-gray-800 mb-1">
                      {entry.title}
                    </h3>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {entry.content}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(entry.id);
                  }}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
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
              <div className="text-xs text-gray-500">
                작성자: {entry.profiles?.full_name || "알 수 없음"} |
                {entry.created_at !== entry.updated_at ? "수정됨" : "작성됨"}:{" "}
                {dayjs(entry.updated_at).format("MM-DD HH:mm")}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 다이어리 작성/수정 모달 */}
      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {currentEntry ? "다이어리 수정" : "다이어리 작성"}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {dayjs(selectedDate).format("YYYY년 MM월 DD일 (ddd)")}
                </p>
              </div>
              <button
                onClick={() => setShowEditor(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  날짜
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    handleDateSelect(e.target.value);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목 (선택사항)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="오늘의 메모를 작성하세요..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={12}
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {content.length}자
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setShowEditor(false)}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !content.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "저장 중..." : currentEntry ? "수정" : "작성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
