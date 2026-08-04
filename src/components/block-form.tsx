'use client';

import { useActionState, useId, useState } from 'react';
import { createBlockAction, updateBlockAction } from '@/app/(app)/blocks/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { BlockStatus, RoomType } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { BLOCK_LABELS } from './status-badge';

const inputClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';

/** 취소는 별도 확인이 필요한 행위라 이 목록에서 뺀다. */
const EDITABLE_STATUSES: BlockStatus[] = [
  'INQUIRY',
  'TENTATIVE',
  'DEFINITE',
  'ACTUAL',
  'CANCELLED',
];

/**
 * 블록 생성 폼.
 *
 * 접어 두는 이유는 목록이 주 화면이기 때문이다. 단체 등록은 자주 일어나지 않는다.
 */
export function CreateBlockForm({
  propertyId,
  roomTypes,
}: {
  propertyId: string;
  roomTypes: RoomType[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(createBlockAction, IDLE);
  const [open, setOpen] = useState(false);
  const uid = useId();

  // React 19 는 액션이 끝나면 비제어 입력을 비운다. 실패했을 때는 액션이
  // 돌려준 값을 defaultValue 로 다시 심어야 사용자가 처음부터 채우지 않는다.
  const kept = state.status === 'error' ? state.values : undefined;
  const keptCounts = (kept?.blocked ?? '').split(',');

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium"
        >
          블록 만들기
        </button>
        <ActionMessage state={state} />
      </div>
    );
  }

  return (
    <form action={action} className="rounded-lg border border-current/10 px-4 py-3">
      <input type="hidden" name="propertyId" value={propertyId} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">새 단체 블록</legend>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-code`} className="text-xs text-subtle">
              블록 코드
            </label>
            <input
              id={`${uid}-code`}
              name="code"
              required
              maxLength={20}
              pattern="[A-Za-z0-9_-]+"
              placeholder="SPGRP"
              defaultValue={kept?.code ?? ''}
              className={`w-32 font-mono uppercase ${inputClass}`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-name`} className="text-xs text-subtle">
              단체 이름
            </label>
            <input
              id={`${uid}-name`}
              name="name"
              required
              maxLength={100}
              placeholder="스페이스플래닝 워크숍"
              defaultValue={kept?.name ?? ''}
              className={`w-64 ${inputClass}`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-start`} className="text-xs text-subtle">
              시작일
            </label>
            <input
              id={`${uid}-start`}
              name="startDate"
              type="date"
              required
              defaultValue={kept?.startDate ?? ''}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-end`} className="text-xs text-subtle">
              종료일
            </label>
            <input
              id={`${uid}-end`}
              name="endDate"
              type="date"
              required
              defaultValue={kept?.endDate ?? ''}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-cutoff`} className="text-xs text-subtle">
              컷오프 (선택)
            </label>
            <input
              id={`${uid}-cutoff`}
              name="cutoffDate"
              type="date"
              defaultValue={kept?.cutoffDate ?? ''}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-rate`} className="text-xs text-subtle">
              요금제 (선택)
            </label>
            <input
              id={`${uid}-rate`}
              name="ratePlanCode"
              maxLength={20}
              placeholder="CORP"
              defaultValue={kept?.ratePlanCode ?? ''}
              className={`w-28 font-mono uppercase ${inputClass}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <span className="text-xs text-subtle">객실 타입별 수량 — 0 은 잡지 않습니다</span>
          {roomTypes.map((type, index) => (
            <div key={type.id} className="flex flex-col gap-1">
              <label htmlFor={`${uid}-${type.code}`} className="text-xs text-subtle">
                {type.code}
              </label>
              <input type="hidden" name="roomTypeCode" value={type.code} />
              <input
                id={`${uid}-${type.code}`}
                name="blocked"
                type="number"
                min={0}
                max={999}
                defaultValue={keptCounts[index] ?? 0}
                className={`w-20 tabular-nums ${inputClass}`}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <span className="text-xs text-subtle">협의 요금 — 비우면 요금제 값으로 팝니다</span>
          {roomTypes.map((type) => (
            <div key={type.id} className="flex flex-col gap-1">
              <label htmlFor={`${uid}-amount-${type.code}`} className="text-xs text-subtle">
                {type.code}
              </label>
              <input
                id={`${uid}-amount-${type.code}`}
                name={`amount:${type.code}`}
                type="number"
                min={0}
                step={1}
                placeholder="요금제 값"
                className={`w-28 tabular-nums ${inputClass}`}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <SubmitButton pendingLabel="만드는 중…">블록 생성</SubmitButton>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-current/20 px-3 py-1.5 text-sm transition-colors hover:bg-current/5"
          >
            닫기
          </button>
        </div>
      </fieldset>

      <p className="mt-1.5 text-xs text-subtle">
        재고 확보 여부는 OPERA 가 판단합니다. 컷오프는 시작일보다 앞이어야 합니다.
      </p>
      <ActionMessage state={state} />
    </form>
  );
}

/**
 * 블록 상태·컷오프 수정.
 *
 * 상태와 컷오프를 한 폼에 둔 이유는 둘 다 "이 단체를 언제까지 붙들지" 하나의
 * 결정이기 때문이다. 따로 두면 확정만 하고 컷오프를 잊는 일이 생긴다.
 */
export function BlockEditor({
  blockId,
  status,
  name,
  cutoffDate,
  rates = [],
}: {
  blockId: string;
  status: BlockStatus;
  name: string;
  cutoffDate: string | null;
  /** 지금 잡혀 있는 객실 타입별 협의 요금. 빈 칸은 건드리지 않는다. */
  rates?: Array<{ roomTypeCode: string; amount: string | null }>;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateBlockAction, IDLE);
  const uid = useId();

  return (
    <form action={action} className="rounded-lg border border-current/10 px-4 py-3">
      <input type="hidden" name="blockId" value={blockId} />

      <fieldset className="flex flex-wrap items-end gap-2">
        <legend className="mb-2 text-sm font-medium">블록 수정</legend>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-name`} className="text-xs text-subtle">
            이름
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            defaultValue={name}
            maxLength={100}
            className={`w-64 ${inputClass}`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-status`} className="text-xs text-subtle">
            상태
          </label>
          <select id={`${uid}-status`} name="status" defaultValue={status} className={inputClass}>
            {EDITABLE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {BLOCK_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-cutoff`} className="text-xs text-subtle">
            컷오프
          </label>
          <input
            id={`${uid}-cutoff`}
            name="cutoffDate"
            type="date"
            defaultValue={cutoffDate?.slice(0, 10) ?? ''}
            className={inputClass}
          />
        </div>

        {rates.map((rate) => (
          <div key={rate.roomTypeCode} className="flex flex-col gap-1">
            <label htmlFor={`${uid}-rate-${rate.roomTypeCode}`} className="text-xs text-subtle">
              {rate.roomTypeCode} 협의가
            </label>
            <input
              id={`${uid}-rate-${rate.roomTypeCode}`}
              name={`rate:${rate.roomTypeCode}`}
              type="number"
              min={0}
              step={1}
              placeholder={rate.amount ? Number(rate.amount).toLocaleString('ko-KR') : '요금제 값'}
              className={`w-28 tabular-nums ${inputClass}`}
            />
          </div>
        ))}

        <SubmitButton pendingLabel="반영 중…">저장</SubmitButton>
      </fieldset>

      <p className="mt-1.5 text-xs text-subtle">
        확정(DEFINITE)부터 재고를 실제로 잡습니다. 이미 픽업된 예약이 있으면 취소할 수 없습니다.
        협의 요금을 바꿔도 이미 빠져나간 예약의 금액은 그대로입니다.
      </p>
      <ActionMessage state={state} />
    </form>
  );
}
