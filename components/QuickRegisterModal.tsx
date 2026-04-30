"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

type Preset = {
  id: string;
  name: string;
  clock_in: string;
  clock_out: string;
  days_of_week: number[];
};

type Props = {
  onClose: () => void;
  onSuccess?: () => void;
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 오늘 포함 3일 전까지만 (총 4일)
function getNearDates() {
  const dates: { value: string; label: string; dow: number }[] = [];
  for (let i = -3; i <= 0; i++) {
    const d = dayjs().add(i, "day");
    dates.push({
      value: d.format("YYYY-MM-DD"),
      label: d.format("M/D") + " (" + DAY_LABELS[d.day()] + ")",
      dow: d.day(),
    });
  }
  return dates;
}

export default function QuickRegisterModal({ onClose, onSuccess }: Props) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{ date: string; ok: boolean; msg: string }[]>([]);
  const [done, setDone] = useState(false);

  // 프리셋 관리
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetIn, setPresetIn] = useState("09:00");
  const [presetOut, setPresetOut] = useState("18:00");
  const [presetDays, setPresetDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [savingPreset, setSavingPreset] = useState(false);

  const nearDates = getNearDates();

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("work_presets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");
    setPresets(data || []);
    setLoadingPresets(false);
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) { alert("프리셋 이름을 입력해주세요."); return; }
    setSavingPreset(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingPreset) {
      await supabase.from("work_presets").update({
        name: presetName.trim(),
        clock_in: presetIn + ":00",
        clock_out: presetOut + ":00",
        days_of_week: presetDays,
      }).eq("id", editingPreset.id);
    } else {
      await supabase.from("work_presets").insert({
        user_id: user.id,
        name: presetName.trim(),
        clock_in: presetIn + ":00",
        clock_out: presetOut + ":00",
        days_of_week: presetDays,
      });
    }
    await fetchPresets();
    setShowPresetForm(false);
    setEditingPreset(null);
    setPresetName("");
    setPresetIn("09:00");
    setPresetOut("18:00");
    setPresetDays([1, 2, 3, 4, 5]);
    setSavingPreset(false);
  };

  const handleDeletePreset = async (id: string) => {
    if (!confirm("이 프리셋을 삭제하시겠습니까?")) return;
    const supabase = createClient();
    await supabase.from("work_presets").delete().eq("id", id);
    if (selectedPreset?.id === id) setSelectedPreset(null);
    await fetchPresets();
  };

  const openEditPreset = (p: Preset) => {
    setEditingPreset(p);
    setPresetName(p.name);
    setPresetIn(p.clock_in.slice(0, 5));
    setPresetOut(p.clock_out.slice(0, 5));
    setPresetDays(p.days_of_week || []);
    setShowPresetForm(true);
  };

  const toggleDate = (val: string) => {
    setSelectedDates((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
    );
  };

  // 프리셋의 요일에 맞는 날짜 자동 선택
  const autoSelectByDays = () => {
    if (!selectedPreset) return;
    const days = selectedPreset.days_of_week || [];
    if (days.length === 0) return;
    const matched = nearDates.filter((d) => days.includes(d.dow)).map((d) => d.value);
    setSelectedDates(matched);
  };

  const handleQuickRegister = async () => {
    if (!selectedPreset) { alert("프리셋을 선택해주세요."); return; }
    if (selectedDates.length === 0) { alert("날짜를 선택해주세요."); return; }

    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const res: { date: string; ok: boolean; msg: string }[] = [];

    for (const date of [...selectedDates].sort()) {
      // 중복 확인
      const { data: existing } = await supabase
        .from("work_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", date)
        .single();

      if (existing) {
        res.push({ date, ok: false, msg: "이미 등록됨" });
        continue;
      }

      const { error } = await supabase.from("work_logs").insert({
        user_id: user.id,
        date,
        work_type: "work",
        clock_in: selectedPreset.clock_in,
        clock_out: selectedPreset.clock_out,
        status: "pending",
      });

      res.push({ date, ok: !error, msg: error ? error.message : "등록 완료" });
    }

    setResults(res);
    setDone(true);
    setSubmitting(false);
    onSuccess?.();
  };

  // 완료 화면
  if (done) {
    const successCount = results.filter((r) => r.ok).length;
    const failCount = results.filter((r) => !r.ok).length;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
        <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl">
          <div className="px-4 py-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900">등록 결과</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{successCount}</p>
                <p className="text-xs text-green-700 mt-0.5">등록 완료</p>
              </div>
              <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{failCount}</p>
                <p className="text-xs text-red-600 mt-0.5">건너뜀</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {results.map((r) => (
                <div key={r.date} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${r.ok ? "bg-green-50" : "bg-gray-50"}`}>
                  <span className={r.ok ? "text-gray-700" : "text-gray-400"}>
                    {dayjs(r.date).format("M/D (ddd)")} {/* dayjs locale 없으면 숫자로 나옴 */}
                    {dayjs(r.date).format("M/D")} ({DAY_LABELS[dayjs(r.date).day()]})
                  </span>
                  <span className={`text-xs font-semibold ${r.ok ? "text-green-600" : "text-gray-400"}`}>
                    {r.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <button onClick={onClose} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors">
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">⚡ 퀵 근무 등록</h3>
            <p className="text-xs text-gray-500 mt-0.5">프리셋으로 여러 날짜를 한번에 등록</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* STEP 1: 프리셋 선택 */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-700">1. 근무 패턴 선택</p>
              <button
                onClick={() => { setEditingPreset(null); setPresetName(""); setPresetIn("09:00"); setPresetOut("18:00"); setPresetDays([1,2,3,4,5]); setShowPresetForm(true); }}
                className="text-xs text-blue-600 font-semibold flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                새 패턴
              </button>
            </div>

            {loadingPresets ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => <div key={i} className="animate-pulse h-14 bg-gray-100 rounded-xl" />)}
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">저장된 패턴이 없습니다</p>
                <button
                  onClick={() => { setEditingPreset(null); setPresetName(""); setPresetIn("09:00"); setPresetOut("18:00"); setPresetDays([1,2,3,4,5]); setShowPresetForm(true); }}
                  className="text-sm text-blue-600 font-semibold"
                >
                  첫 패턴 만들기 →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {presets.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPreset(p)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPreset?.id === p.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      selectedPreset?.id === p.id ? "border-blue-500 bg-blue-500" : "border-gray-300"
                    }`}>
                      {selectedPreset?.id === p.id && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">
                        {p.clock_in.slice(0,5)} ~ {p.clock_out.slice(0,5)}
                        {p.days_of_week?.length > 0 && (
                          <span className="ml-2 text-blue-500">
                            {p.days_of_week.map((d) => DAY_LABELS[d]).join("·")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditPreset(p); }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(p.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 프리셋 폼 (인라인) */}
          {showPresetForm && (
            <div className="mx-4 mb-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm font-bold text-blue-800 mb-3">
                {editingPreset ? "패턴 수정" : "새 패턴 만들기"}
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="패턴 이름 (예: 평일 오전)"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 mb-1 block">출근</label>
                    <input type="time" value={presetIn} onChange={(e) => setPresetIn(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 mb-1 block">퇴근</label>
                    <input type="time" value={presetOut} onChange={(e) => setPresetOut(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1.5 block">주로 근무하는 요일</label>
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPresetDays((prev) => prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i])}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          presetDays.includes(i)
                            ? "bg-blue-500 text-white"
                            : "bg-white text-gray-500 border border-gray-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowPresetForm(false); setEditingPreset(null); }}
                    className="flex-1 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSavePreset}
                    disabled={savingPreset}
                    className="flex-1 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {savingPreset ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: 날짜 선택 */}
          {selectedPreset && (
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-700">2. 날짜 선택</p>
                <div className="flex gap-2">
                  {selectedPreset.days_of_week?.length > 0 && (
                    <button onClick={autoSelectByDays} className="text-xs text-blue-600 font-semibold">
                      요일 자동선택
                    </button>
                  )}
                  {selectedDates.length > 0 && (
                    <button onClick={() => setSelectedDates([])} className="text-xs text-gray-400">
                      초기화
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {nearDates.map((d) => {
                  const isSelected = selectedDates.includes(d.value);
                  const isToday = d.value === dayjs().format("YYYY-MM-DD");
                  const isSun = d.dow === 0;
                  const isSat = d.dow === 6;
                  return (
                    <button
                      key={d.value}
                      onClick={() => toggleDate(d.value)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        isSelected
                          ? "bg-blue-500 text-white shadow-md"
                          : isToday
                          ? "bg-amber-50 border-2 border-amber-300 text-amber-700"
                          : isSun
                          ? "bg-red-50 text-red-400 border border-red-100"
                          : isSat
                          ? "bg-blue-50 text-blue-400 border border-blue-100"
                          : "bg-gray-50 text-gray-600 border border-gray-100"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {selectedDates.length > 0 && (
                <p className="text-xs text-blue-600 font-semibold mt-2 text-center">
                  {selectedDates.length}일 선택됨 · {selectedPreset.clock_in.slice(0,5)}~{selectedPreset.clock_out.slice(0,5)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          {selectedPreset && selectedDates.length > 0 && (
            <button
              onClick={handleQuickRegister}
              disabled={submitting}
              className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  등록 중...
                </>
              ) : (
                <>
                  ⚡ {selectedDates.length}일 한번에 등록
                </>
              )}
            </button>
          )}
          <button onClick={onClose} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
