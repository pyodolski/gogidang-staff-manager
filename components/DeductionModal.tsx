"use client";
import { useState } from "react";
import { createClient } from "../lib/supabase/client";

type Employee = {
  id: string;
  full_name: string;
  email: string;
};

type Deduction = {
  id: number;
  user_id: string;
  name: string;
  amount: number;
  type: "fixed" | "percentage";
  is_active: boolean;
};

type Props = {
  employee: Employee;
  deduction?: Deduction | null;
  onClose: () => void;
  onSave: () => void;
};

export default function DeductionModal({
  employee,
  deduction,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(deduction?.name || "");
  const [amount, setAmount] = useState(deduction?.amount?.toString() || "");
  const [type, setType] = useState<"fixed" | "percentage">(
    deduction?.type || "fixed"
  );
  const [isActive, setIsActive] = useState(deduction?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 미리 정의된 공제 항목들
  const presetDeductions = [
    { name: "소득세", type: "percentage" as const, amount: 3 },
    { name: "지방세", type: "percentage" as const, amount: 0.3 },
    { name: "국민연금", type: "percentage" as const, amount: 4.5 },
    { name: "건강보험", type: "percentage" as const, amount: 3.545 },
    { name: "장기요양보험", type: "percentage" as const, amount: 0.4091 },
    { name: "고용보험", type: "percentage" as const, amount: 0.9 },
    { name: "식대", type: "fixed" as const, amount: 100000 },
    { name: "교통비", type: "fixed" as const, amount: 50000 },
  ];

  const handlePresetSelect = (preset: (typeof presetDeductions)[0]) => {
    setName(preset.name);
    setType(preset.type);
    setAmount(preset.amount.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!name.trim()) {
      setError("항목명을 입력해주세요.");
      setLoading(false);
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0) {
      setError("올바른 금액을 입력해주세요.");
      setLoading(false);
      return;
    }

    if (type === "percentage" && amountNum > 100) {
      setError("비율은 100%를 초과할 수 없습니다.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      const deductionData = {
        user_id: employee.id,
        name: name.trim(),
        amount: amountNum,
        type,
        is_active: isActive,
      };

      let result;
      if (deduction) {
        // 수정
        result = await supabase
          .from("salary_deductions")
          .update(deductionData)
          .eq("id", deduction.id);
      } else {
        // 추가
        result = await supabase.from("salary_deductions").insert(deductionData);
      }

      if (result.error) {
        setError(result.error.message);
      } else {
        onSave();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {deduction ? "공제 항목 수정" : "공제 항목 추가"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded">
          <div className="text-sm text-blue-800">
            <strong>{employee.full_name}</strong> ({employee.email})
          </div>
        </div>

        {/* 미리 정의된 항목들 */}
        {!deduction && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">빠른 선택</label>
            <div className="grid grid-cols-2 gap-2">
              {presetDeductions.map((preset, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="p-2 text-xs border rounded hover:bg-gray-50 text-left"
                >
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-gray-500">
                    {preset.type === "fixed"
                      ? `${preset.amount.toLocaleString()}원`
                      : `${preset.amount}%`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">항목명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 국민연금, 건강보험, 식대 등"
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">공제 유형</label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as "fixed" | "percentage")
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="fixed">고정 금액</option>
              <option value="percentage">비율 (급여의 %)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {type === "fixed" ? "공제 금액 (원)" : "공제 비율 (%)"}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={type === "fixed" ? "100000" : "4.5"}
              step={type === "fixed" ? "1000" : "0.1"}
              min="0"
              max={type === "percentage" ? "100" : undefined}
              className="w-full border rounded px-3 py-2"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              {type === "fixed"
                ? "매월 고정으로 공제될 금액을 입력하세요"
                : "급여에서 공제될 비율을 입력하세요 (예: 4.5% → 4.5 입력)"}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm">
              활성화 (체크 해제 시 공제되지 않음)
            </label>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "저장 중..." : deduction ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
