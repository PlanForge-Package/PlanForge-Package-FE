import clsx, { type ClassValue } from 'clsx';

/**
 * Class composition.
 *
 * Conditional classes were written as template literals with nested ternaries, which
 * silently emit `undefined` and `false` into the class string. `clsx` drops them.
 */
export function cn(...values: ClassValue[]): string {
  return clsx(values);
}

export type ControlSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const CONTROL_BASE = 'rounded-md border border-current/20 bg-transparent text-ink';

/**
 * The size scale for form controls.
 *
 * These six combinations were already spread across the screens as literal class
 * strings. Naming them keeps a change to the scale a single edit, and stops a new
 * screen inventing a seventh.
 */
const CONTROL_SIZE: Record<ControlSize, string> = {
  '2xs': 'px-1.5 py-0.5 text-xs',
  xs: 'px-2 py-1 text-xs',
  sm: 'px-2 py-1 text-sm',
  md: 'px-2 py-1.5 text-sm',
  lg: 'px-3 py-1.5 text-sm',
  xl: 'px-3 py-2 text-sm',
};

/**
 * Input, select and textarea styling.
 *
 * `text-ink` is always included: these controls usually sit inside a `text-subtle`
 * label, and without it the typed value inherits the muted label colour.
 */
export function control(size: ControlSize = 'md', ...extra: ClassValue[]): string {
  return cn(CONTROL_BASE, CONTROL_SIZE[size], extra);
}

/** Primary action. One per form — the one the user came to press. */
export function primaryButton(...extra: ClassValue[]): string {
  return cn('btn-primary rounded-md px-3 py-1.5 text-sm font-medium', extra);
}

/** Inline action inside a table row or toolbar. */
export function ghostButton(...extra: ClassValue[]): string {
  return cn(
    'rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors',
    'hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50',
    extra,
  );
}

/** Panel that groups a form or a list. */
export function card(...extra: ClassValue[]): string {
  return cn('rounded-lg border border-current/10 px-4 py-3', extra);
}

/** Placeholder shown where a list would be. */
export function placeholder(...extra: ClassValue[]): string {
  return cn(
    'rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle',
    extra,
  );
}
