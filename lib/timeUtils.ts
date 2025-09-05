import dayjs from "dayjs";

/**
 * 근무 시간을 계산합니다 (야간 근무 지원)
 * @param clockIn 출근 시간 (HH:mm 또는 HH:mm:ss 형식)
 * @param clockOut 퇴근 시간 (HH:mm 또는 HH:mm:ss 형식)
 * @param workType 근무 유형 (day_off인 경우 0 반환)
 * @returns 근무 시간 (시간 단위)
 */
export function calculateWorkHours(
  clockIn: string | null,
  clockOut: string | null,
  workType?: string
): number {
  // 휴무인 경우
  if (workType === "day_off" || !clockIn || !clockOut) {
    return 0;
  }

  // 시간 문자열을 더 안전하게 파싱
  const clockInStr = clockIn.includes(":") ? clockIn : clockIn + ":00";
  const clockOutStr = clockOut.includes(":") ? clockOut : clockOut + ":00";

  // 기준 날짜를 사용하여 시간 생성
  const baseDate = "2024-01-01";
  const start = dayjs(`${baseDate} ${clockInStr}`);
  let end = dayjs(`${baseDate} ${clockOutStr}`);

  // 퇴근 시간이 출근 시간보다 이른 경우 (야간 근무)
  if (end.isBefore(start)) {
    end = end.add(1, "day");
  }

  if (start.isValid() && end.isValid()) {
    const minutes = end.diff(start, "minute");
    return minutes > 0 ? minutes / 60 : 0;
  }

  return 0;
}

/**
 * 근무 시간을 문자열로 포맷합니다
 * @param clockIn 출근 시간
 * @param clockOut 퇴근 시간
 * @param workType 근무 유형
 * @returns 포맷된 시간 문자열
 */
export function formatWorkHours(
  clockIn: string | null,
  clockOut: string | null,
  workType?: string
): string {
  if (workType === "day_off") {
    return "휴무";
  }

  const hours = calculateWorkHours(clockIn, clockOut, workType);
  return hours.toFixed(2);
}

/**
 * 야간 근무인지 확인합니다
 * @param clockIn 출근 시간
 * @param clockOut 퇴근 시간
 * @returns 야간 근무 여부
 */
export function isNightShift(
  clockIn: string | null,
  clockOut: string | null
): boolean {
  if (!clockIn || !clockOut) return false;

  const clockInStr = clockIn.includes(":") ? clockIn : clockIn + ":00";
  const clockOutStr = clockOut.includes(":") ? clockOut : clockOut + ":00";

  const baseDate = "2024-01-01";
  const start = dayjs(`${baseDate} ${clockInStr}`);
  const end = dayjs(`${baseDate} ${clockOutStr}`);

  return end.isBefore(start);
}

/**
 * 근무 시간을 분 단위로 계산합니다
 * @param clockIn 출근 시간
 * @param clockOut 퇴근 시간
 * @param workType 근무 유형
 * @returns 근무 시간 (분 단위)
 */
export function calculateWorkMinutes(
  clockIn: string | null,
  clockOut: string | null,
  workType?: string
): number {
  // 휴무인 경우
  if (workType === "day_off" || !clockIn || !clockOut) {
    return 0;
  }

  // 시간 문자열을 더 안전하게 파싱
  const clockInStr = clockIn.includes(":") ? clockIn : clockIn + ":00";
  const clockOutStr = clockOut.includes(":") ? clockOut : clockOut + ":00";

  // 기준 날짜를 사용하여 시간 생성
  const baseDate = "2024-01-01";
  const start = dayjs(`${baseDate} ${clockInStr}`);
  let end = dayjs(`${baseDate} ${clockOutStr}`);

  // 퇴근 시간이 출근 시간보다 이른 경우 (야간 근무)
  if (end.isBefore(start)) {
    end = end.add(1, "day");
  }

  if (start.isValid() && end.isValid()) {
    const minutes = end.diff(start, "minute");
    return minutes > 0 ? minutes : 0;
  }

  return 0;
}