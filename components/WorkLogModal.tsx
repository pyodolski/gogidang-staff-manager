"use client";
import { useState, useEffect } from "react";
import { createClient } from "../lib/supabase/client";
import dayjs from "dayjs";

type Employee = {
  id: string;
  full_name: string;
  email: string;
};

type WorkLog = {
  id: number;
  user_id: string;
  date: string;
  clock_in: string;
  clock_out: string;
  status: string;
  created_at: string;
};

type Props = {
  employee: Employee;
  workLog?: WorkLog | null;
  onClose: () => void;
  onSave: () => void;
};

export default function WorkLogModal({
  employee,
  workLog,
  onClose,
  onSave,
}: Props) {
  const [date, setDate] = useState(
    workLog?.date || dayjs().format("YYYY-MM-DD")
  );
  const [clockIn, setClockIn] = useState(
    workLog?.clock_in ? workLog.clock_in.substring(0, 5) : "09:00"
  );
  const [clockOut, setClockOut] = useState(
    workLog?.clock_out ? workLog.clock_out.substring(0, 5) : "18:00"
  );
  const [status, setStatus] = useState(workLog?.status || "approved");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    try {
      const workData = {
        user_id: employee.id,
        date,
        clock_in: clockIn + ":00",
        clock_out: clockOut + ":00",
        status,
      };

      let result;
      if (workLog) {
        // 수정
        result = await supabase
          .from("work_logs")
          .update(workData)
          .eq("id", workLog.id);
      } else {
        // 추가
        result = await supabase.from("work_logs").insert(workData);
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

  const calculateWorkHours = () => {
    const start = dayjs(`2024-01-01 ${clockIn}:00`);
    const end = dayjs(`2024-01-01 ${clockOut}:00`);

    if (start.isValid() && end.isValid() && end.isAfter(start)) {
      const minutes = end.diff(start, "minute");
      return (minutes / 60).toFixed(1);
    }
    return "0.0";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {workLog ? "근무 기록 수정" : "근무 기록 추가"}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">출근시간</label>
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">퇴근시간</label>
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">상태</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="pending">승인 대기</option>
              <option value="approved">승인됨</option>
              <option value="rejected">거절됨</option>
            </select>
          </div>

          <div className="p-3 bg-gray-50 rounded">
            <div className="text-sm text-gray-600">
              예상 근무시간: <strong>{calculateWorkHours()}시간</strong>
            </div>
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
              {loading ? "저장 중..." : workLog ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
