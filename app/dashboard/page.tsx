"use client";
import WorkSummary from "../../components/WorkSummary";
import WorkRegisterModal from "../../components/WorkRegisterModal";
import WorkCalendar from "../../components/WorkCalendar";
import PendingWorkTable from "../../components/PendingWorkTable";
import AuthButton from "../../components/AuthButton";
import AnnouncementBanner from "../../components/AnnouncementBanner";

import { useState } from "react";

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<
    "summary" | "calendar" | "history"
  >("summary");
  const [announcementRefreshTrigger, setAnnouncementRefreshTrigger] =
    useState(0);
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);

  const handleWorkRegistered = () => {
    // 데이터 새로고침 트리거
    setDataRefreshTrigger((prev) => prev + 1);
  };

  const tabs = [
    {
      id: "summary",
      name: "급여 요약",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
        </svg>
      ),
    },
    {
      id: "calendar",
      name: "근무 캘린더",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
        </svg>
      ),
    },
    {
      id: "history",
      name: "근무 내역",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <main className="max-w-4xl mx-auto py-4 px-4">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-1">
              직원 대시보드
            </h1>
            <p className="text-gray-600 text-sm md:text-base">
              근무 시간을 관리하고 급여를 확인하세요
            </p>
          </div>
          <AuthButton />
        </div>

        {/* 공지사항 배너 */}
        <AnnouncementBanner refreshTrigger={announcementRefreshTrigger} />

        {/* 급여 요약과 빠른 액션 (항상 표시) */}
        <div className="space-y-4 mb-6">
          <WorkSummary
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            refreshTrigger={dataRefreshTrigger}
          />

          {/* 빠른 액션 카드 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-white/50 p-5">
            <button
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-6 py-4 rounded-xl hover:shadow-xl transition-all duration-200 transform hover:scale-105 font-semibold text-lg"
              onClick={() => setShowModal(true)}
            >
              <span className="flex items-center justify-center gap-3">
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
              </span>
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 - 데스크톱 */}
        <div className="hidden md:block bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 mb-6 overflow-hidden">
          <div className="flex p-2 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-xl transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg scale-105"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 모바일 탭 네비게이션 - 하단 고정 */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-50 safe-area-pb shadow-2xl">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-all ${
                  activeTab === tab.id ? "text-blue-600" : "text-gray-500"
                }`}
              >
                <div
                  className={`p-2 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white scale-110"
                      : "bg-transparent"
                  }`}
                >
                  {tab.icon}
                </div>
                <span className="mt-1 text-[10px]">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="min-h-[400px] pb-20 md:pb-0">
          {activeTab === "summary" && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-white/50 p-8">
              <div className="text-center py-8">
                <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  급여 요약
                </h3>
                <p className="text-gray-600">
                  위의 급여 요약 카드에서 이번 달 급여 정보를 확인하세요.
                </p>
              </div>
            </div>
          )}

          {activeTab === "calendar" && (
            <WorkCalendar
              selectedMonth={selectedMonth}
              refreshTrigger={dataRefreshTrigger}
            />
          )}

          {activeTab === "history" && (
            <PendingWorkTable refreshTrigger={dataRefreshTrigger} />
          )}
        </div>

        {/* 근무 등록 모달 */}
        {showModal && (
          <WorkRegisterModal
            onClose={() => setShowModal(false)}
            onSuccess={handleWorkRegistered}
          />
        )}
      </main>

      {/* 모바일 전용 스타일 */}
      <style jsx>{`
        @media (max-width: 768px) {
          .safe-area-pb {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </div>
  );
}
