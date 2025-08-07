"use client";
import WorkSummary from "../../components/WorkSummary";
import WorkRegisterModal from "../../components/WorkRegisterModal";
import WorkCalendar from "../../components/WorkCalendar";
import PendingWorkTable from "../../components/PendingWorkTable";
import AuthButton from "../../components/AuthButton";

import { useState } from "react";

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<
    "summary" | "calendar" | "history"
  >("summary");

  const tabs = [
    {
      id: "summary",
      name: "급여 요약",
      icon: (
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
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
          />
        </svg>
      ),
    },
    {
      id: "calendar",
      name: "근무 캘린더",
      icon: (
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
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: "history",
      name: "근무 내역",
      icon: (
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
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <main className="max-w-4xl mx-auto py-4 px-4">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
              직원 대시보드
            </h1>
            <p className="text-gray-600 text-sm md:text-base">
              근무 시간을 관리하고 급여를 확인하세요
            </p>
          </div>
          <AuthButton />
        </div>

        {/* 급여 요약과 빠른 액션 (항상 표시) */}
        <div className="space-y-4 mb-6">
          <WorkSummary
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />

          {/* 빠른 액션 카드 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <button
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
              onClick={() => setShowModal(true)}
            >
              <span className="flex items-center justify-center gap-2">
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                근무 등록
              </span>
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 - 데스크톱 */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                } ${tab.id === "summary" ? "rounded-tl-xl" : ""} ${
                  tab.id === "history" ? "rounded-tr-xl" : ""
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 모바일 탭 네비게이션 - 하단 고정 */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center justify-center py-3 px-2 text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600"
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    activeTab === tab.id ? "bg-blue-100" : ""
                  }`}
                >
                  {tab.icon}
                </div>
                <span className="mt-1">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="min-h-[400px] pb-20 md:pb-0">
          {activeTab === "summary" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="text-center py-8">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  급여 요약
                </h3>
                <p className="text-gray-600">
                  위의 급여 요약 카드에서 이번 달 급여 정보를 확인하세요.
                </p>
              </div>
            </div>
          )}

          {activeTab === "calendar" && (
            <WorkCalendar selectedMonth={selectedMonth} />
          )}

          {activeTab === "history" && <PendingWorkTable />}
        </div>

        {/* 근무 등록 모달 */}
        {showModal && <WorkRegisterModal onClose={() => setShowModal(false)} />}
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
