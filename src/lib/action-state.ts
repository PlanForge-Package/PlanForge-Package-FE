/**
 * Shared result type for form actions.
 *
 * A `'use server'` file may export only async functions, so types and constants live here.
 * Kept in the action module they build fine but blow up at runtime with
 * "A 'use server' file can only export async functions".
 *
 * Actions return failures rather than throwing — a thrown server action has its message
 * stripped by Next in production, leaving a digest and no idea what to fix.
 */
export interface ActionState {
  status: 'idle' | 'success' | 'error';
  message: string;
  /**
   * What the user had typed when it failed.
   *
   * React 19 resets uncontrolled inputs once a form action finishes. Without handing
   * the failed values back, a fully filled form is emptied alongside a one-line error.
   * The screen re-seeds them as `defaultValue`.
   */
  values?: Record<string, string>;
}

export const IDLE: ActionState = { status: 'idle', message: '' };

export function actionError(message: string, values?: Record<string, string>): ActionState {
  return { status: 'error', message, ...(values ? { values } : {}) };
}

export function actionSuccess(message: string): ActionState {
  return { status: 'success', message };
}

/**
 * Picks out only the values worth returning to the form.
 *
 * Fields are listed explicitly so nothing like a password can slip in.
 */
export function formValues(formData: FormData, fields: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const value = formData.get(field);
    if (typeof value === 'string') values[field] = value;
  }
  return values;
}
