"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

type Announcement = {
  id: number;
  title: string;
  content: string;
  priority: number;
  created_at: string;
  profiles?: {
    full_name: string;
  };
};

type Props = {
  isAdmin?: boolean;
  onManageClick?: () => void;
  refreshTrigger?: number; // 새로고침 트리거용 prop
};

export default function AnnouncementBanner({
  isAdmin = false,
  onManageClick,
  refreshTrigger = 0,
}: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchAnnouncements = async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("announcements")
        .select(`*, profiles (full_name)`)
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching announcements:", error);
        setAnnouncements([]);
      } else {
        setAnnouncements(data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching announcements:", err);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (announcementId: number) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("announcement_reads").upsert({
        announcement_id: announcementId,
        user_id: user.id,
      });
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [refreshTrigger]); // refreshTrigger가 변경될 때마다 새로고침

  // 자동 슬라이드 (긴급/중요 공지가 있을 때만)
  useEffect(() => {
    if (announcements.length > 1) {
      const hasUrgent = announcements.some((a) => a.priority >= 2);
      if (hasUrgent) {
        const interval = setInterval(() => {
          setCurrentIndex((prev) => (prev + 1) % announcements.length);
        }, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [announcements.length]);

  const getPriorityConfig = (priority: number) => {
    switch (priority) {
      case 3:
        return {
          bg: "from-red-500 to-red-600",
          icon: "🚨",
          text: "긴급 공지",
        };
      case 2:
        return {
          bg: "from-orange-500 to-orange-600",
          icon: "⚠️",
          text: "중요 공지",
        };
      default:
        return {
          bg: "from-blue-500 to-blue-600",
          icon: "📢",
          text: "공지사항",
        };
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-gray-300 to-gray-400 rounded-xl p-6 mb-6 animate-pulse">
        <div className="h-6 bg-white/30 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-white/20 rounded w-2/3"></div>
      </div>
    );
  }

  if (announcements.length === 0) {
    // 관리자용 기본 메시지
    if (isAdmin) {
      return (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <div className="bg-white/20 rounded-full p-2 md:p-3 flex-shrink-0">
                <svg
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  className="w-6 h-6 md:w-8 md:h-8"
                >
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"></path>
                  <path
                    d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"
                    fill="white"
                  ></path>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base md:text-xl font-bold mb-1 leading-tight">
                  환영합니다, 관리자님!
                </h2>
                <p className="text-purple-100 text-sm md:text-base leading-relaxed">
                  직원들의 근무 승인과 급여 관리를 효율적으로 처리하세요
                </p>
              </div>
            </div>
            {/* 데스크톱: 공지 관리 버튼 */}
            {onManageClick && (
              <button
                onClick={onManageClick}
                className="hidden md:flex px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
              >
                공지 관리
              </button>
            )}

            {/* 모바일: 공지 관리 아이콘 */}
            {onManageClick && (
              <button
                onClick={onManageClick}
                className="md:hidden p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex-shrink-0"
                title="공지 관리"
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      );
    }

    // 직원용 기본 메시지
    return (
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 md:p-6 mb-6 text-white">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="bg-white/20 rounded-full p-2 md:p-3 flex-shrink-0">
            <svg
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-6 h-6 md:w-8 md:h-8"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-xl font-bold mb-1 leading-tight">
              안녕하세요!
            </h2>
            <p className="text-blue-100 text-sm md:text-base leading-relaxed">
              오늘도 좋은 하루 되세요. 근무 등록을 잊지 마세요!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentAnnouncement = announcements[currentIndex];
  const config = getPriorityConfig(currentAnnouncement.priority);

  return (
    <div
      className={`bg-gradient-to-r ${config.bg} rounded-xl p-4 md:p-6 mb-6 text-white relative overflow-hidden`}
    >
      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      <div className="relative">
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
            <div className="bg-white/20 rounded-full p-2 md:p-3 flex-shrink-0">
              <span className="text-lg md:text-2xl">{config.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 md:gap-2 mb-1 flex-wrap">
                <span className="text-xs md:text-sm font-medium bg-white/20 px-2 py-1 rounded-full whitespace-nowrap">
                  {config.text}
                </span>
                {announcements.length > 1 && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full whitespace-nowrap">
                    {currentIndex + 1} / {announcements.length}
                  </span>
                )}
              </div>
              <h2 className="text-base md:text-xl font-bold leading-tight break-words">
                {currentAnnouncement.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {/* 데스크톱: 공지 관리 버튼 표시 */}
            {isAdmin && onManageClick && (
              <button
                onClick={onManageClick}
                className="hidden md:flex px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                공지 관리
              </button>
            )}

            {/* 모바일: 공지 관리 아이콘만 표시 */}
            {isAdmin && onManageClick && (
              <button
                onClick={onManageClick}
                className="md:hidden p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="공지 관리"
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            )}

            {announcements.length > 1 && (
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    setCurrentIndex(
                      (prev) =>
                        (prev - 1 + announcements.length) % announcements.length
                    )
                  }
                  className="p-1.5 md:p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <svg
                    className="w-3 h-3 md:w-4 md:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    setCurrentIndex((prev) => (prev + 1) % announcements.length)
                  }
                  className="p-1.5 md:p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <svg
                    className="w-3 h-3 md:w-4 md:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-2 md:mb-3">
          <p
            className={`text-white/90 text-sm md:text-base leading-relaxed ${
              expandedId === currentAnnouncement.id ? "" : "line-clamp-2"
            }`}
          >
            {currentAnnouncement.content}
          </p>
          {currentAnnouncement.content.length > 80 && (
            <button
              onClick={() => {
                setExpandedId(
                  expandedId === currentAnnouncement.id
                    ? null
                    : currentAnnouncement.id
                );
                markAsRead(currentAnnouncement.id);
              }}
              className="text-xs md:text-sm text-white/80 hover:text-white underline mt-1"
            >
              {expandedId === currentAnnouncement.id ? "접기" : "더보기"}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs md:text-sm text-white/70">
          <span>
            {dayjs(currentAnnouncement.created_at).format("MM-DD HH:mm")}
          </span>

          {announcements.length > 1 && (
            <div className="flex gap-1">
              {announcements.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-colors ${
                    index === currentIndex ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
