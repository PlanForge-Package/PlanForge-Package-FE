'use client';

import { useRef } from 'react';
import { selectPropertyAction } from '@/app/(app)/property-actions';
import type { Property } from '@/lib/types';

/**
 * 호텔 선택기.
 *
 * 고를 것이 하나뿐이면 이름만 보여준다. 소속이 지정된 직원에게는 애초에 자기
 * 호텔 하나만 내려오므로 선택기가 뜨지 않는다.
 */
export function PropertySwitcher({
  options,
  selectedId,
  canSwitch,
}: {
  options: Property[];
  selectedId: string | null;
  canSwitch: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const only = options[0];
  if (!only) return null;

  if (!canSwitch) {
    return (
      <span className="text-sm opacity-70" title={`OPERA 코드 ${only.operaHotelId}`}>
        {only.name}
      </span>
    );
  }

  return (
    <form ref={formRef} action={selectPropertyAction}>
      <label htmlFor="property-switcher" className="sr-only">
        호텔 선택
      </label>
      <select
        id="property-switcher"
        name="propertyId"
        defaultValue={selectedId ?? ''}
        // 별도 버튼 없이 고르는 즉시 반영한다. 프론트데스크는 한 손으로 쓰는 화면이다.
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-current/20 bg-transparent px-2 py-1 text-sm"
      >
        {options.map((property) => (
          <option key={property.id} value={property.id}>
            {property.name}
          </option>
        ))}
      </select>
    </form>
  );
}
