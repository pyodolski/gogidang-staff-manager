import { useState } from 'react';
import { createClient } from '../lib/supabase/client';
import dayjs from 'dayjs';

type Props = {
  onClose: () => void;
};

export default function WorkRegisterModal({ onClose }: Props) {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [clockIn, setClockIn] = useState('09:00');
  const [clockOut, setClockOut] = useState('18:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('로그인이 필요합니다.');
      setLoading(false);
      return;
    }
    // 프로필 존재 확인 및 생성
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      // 프로필이 없으면 생성
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
          role: 'employee',
          hourly_wage: 10000
        });

      if (profileError) {
        setError('프로필 생성 실패: ' + profileError.message);
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.from('work_logs').insert({
      user_id: user.id,
      date,
      clock_in: clockIn + ':00',
      clock_out: clockOut + ':00',
      status: 'pending',
    });
    
    if (error) {
      setError('등록 실패: ' + error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow p-6 w-full max-w-sm relative">
        <button className="absolute top-2 right-2 text-gray-400" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">근무 등록</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">날짜</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded px-2 py-1 w-full" required />
          </div>
          <div>
            <label className="block mb-1">출근 시간</label>
            <input type="time" value={clockIn} onChange={e => setClockIn(e.target.value)} className="border rounded px-2 py-1 w-full" required />
          </div>
          <div>
            <label className="block mb-1">퇴근 시간</label>
            <input type="time" value={clockOut} onChange={e => setClockOut(e.target.value)} className="border rounded px-2 py-1 w-full" required />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">등록 완료!</div>}
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full" disabled={loading}>
            {loading ? '등록 중...' : '등록'}
          </button>
        </form>
      </div>
    </div>
  );
}
