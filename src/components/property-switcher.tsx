'use client';

import { useRef } from 'react';
import { selectPropertyAction } from '@/app/(app)/property-actions';
import type { Property } from '@/lib/types';

/**
 * Hotel picker.
 *
 * With only one choice it just shows the name. Staff assigned to a property receive
 * only their own hotel, so no picker appears for them.
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
      <span className="text-sm text-subtle" title={`OPERA 코드 ${only.operaHotelId}`}>
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
        // Applied on selection, with no separate button. The front desk works this screen one-handed.
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
