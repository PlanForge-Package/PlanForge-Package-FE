import type { ReservationStatus, RoomStatus } from '@/lib/types';

const RESERVATION_LABELS: Record<ReservationStatus, string> = {
  RESERVED: '예약',
  CONFIRMED: '확정',
  IN_HOUSE: '재실',
  CHECKED_OUT: '체크아웃',
  CANCELLED: '취소',
  NO_SHOW: '노쇼',
  WAITLISTED: '대기',
};

const RESERVATION_TONES: Record<ReservationStatus, string> = {
  RESERVED: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  CONFIRMED: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  IN_HOUSE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  CHECKED_OUT: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
  CANCELLED: 'bg-red-500/15 text-red-700 dark:text-red-300',
  NO_SHOW: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  WAITLISTED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
};

const ROOM_LABELS: Record<RoomStatus, string> = {
  CLEAN: '청소완료',
  DIRTY: '청소필요',
  INSPECTED: '점검완료',
  OUT_OF_ORDER: '고장',
  OUT_OF_SERVICE: '판매중지',
};

const ROOM_TONES: Record<RoomStatus, string> = {
  CLEAN: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  DIRTY: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  INSPECTED: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  OUT_OF_ORDER: 'bg-red-500/15 text-red-700 dark:text-red-300',
  OUT_OF_SERVICE: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
};

const BASE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={`${BASE} ${RESERVATION_TONES[status]}`}>{RESERVATION_LABELS[status]}</span>
  );
}

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  return <span className={`${BASE} ${ROOM_TONES[status]}`}>{ROOM_LABELS[status]}</span>;
}

export { RESERVATION_LABELS, ROOM_LABELS };
