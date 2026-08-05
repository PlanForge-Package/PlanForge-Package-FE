'use client';

import { useCallback, useState } from 'react';
import { IDLE, type ActionState } from './action-state';

/**
 * Shows the result of whichever action ran last.
 *
 * A panel usually drives several actions against the same list, and a row that
 * disappears takes any state held on it with it — so the panel holds them all. Picking
 * "the first non-idle state" by a fixed order then lets an earlier action's message
 * hide every later result: reset a password, deactivate the account, and the admin is
 * still reading the reset notice.
 *
 * Each form marks itself on submit, and the marked one is the one displayed.
 *
 *     const { state, mark } = useLastAction({ assign: assignState, update: updateState });
 *     <form action={assign} onSubmit={mark('assign')}>
 */
export function useLastAction<K extends string>(
  states: Record<K, ActionState>,
): {
  state: ActionState;
  last: K | null;
  mark: (key: K) => () => void;
} {
  const [last, setLast] = useState<K | null>(null);
  const mark = useCallback((key: K) => () => setLast(key), []);
  return { state: last ? (states[last] ?? IDLE) : IDLE, last, mark };
}
