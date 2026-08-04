'use client';

import { useI18n } from '@/lib/i18n/provider';
import type { BlockStatus, ReservationStatus, RoomStatus } from '@/lib/types';

const RESERVATION_TONES: Record<ReservationStatus, string> = {
  RESERVED: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  CONFIRMED: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  IN_HOUSE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  CHECKED_OUT: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
  CANCELLED: 'bg-red-500/15 text-red-700 dark:text-red-300',
  NO_SHOW: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  WAITLISTED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
};

const ROOM_TONES: Record<RoomStatus, string> = {
  CLEAN: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  DIRTY: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  INSPECTED: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  OUT_OF_ORDER: 'bg-red-500/15 text-red-700 dark:text-red-300',
  OUT_OF_SERVICE: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
};

/** 확정(DEFINITE)부터 재고를 실제로 잡는다. 색으로도 그 경계가 보이게 한다. */
const BLOCK_TONES: Record<BlockStatus, string> = {
  INQUIRY: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  TENTATIVE: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  DEFINITE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  CANCELLED: 'bg-red-500/15 text-red-700 dark:text-red-300',
  ACTUAL: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
};

const BASE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const t = useI18n();
  return (
    <span className={`${BASE} ${RESERVATION_TONES[status]}`}>{t.reservationStatus[status]}</span>
  );
}

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const t = useI18n();
  return <span className={`${BASE} ${ROOM_TONES[status]}`}>{t.roomStatus[status]}</span>;
}

export function BlockStatusBadge({ status }: { status: BlockStatus }) {
  const t = useI18n();
  return <span className={`${BASE} ${BLOCK_TONES[status]}`}>{t.blockStatus[status]}</span>;
}
