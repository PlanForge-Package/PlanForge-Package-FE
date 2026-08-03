/**
 * 폼 액션의 공통 결과.
 *
 * `'use server'` 파일은 async 함수만 export 할 수 있으므로 타입과 상수는 여기에 둔다.
 * 액션 모듈에 함께 두면 빌드는 통과하지만 런타임에
 * "A 'use server' file can only export async functions" 로 터진다.
 *
 * 액션은 예외를 던지지 않고 결과로 돌려준다 — 서버 액션이 던지면 Next 가 프로덕션에서
 * 메시지를 지우고 digest 만 남겨, 사용자가 무엇을 고쳐야 할지 알 수 없다.
 */
export interface ActionState {
  status: 'idle' | 'success' | 'error';
  message: string;
  /**
   * 실패했을 때 사용자가 입력했던 값.
   *
   * React 19 는 폼 액션이 끝나면 비제어 입력을 초기화한다. 실패한 값을 그대로
   * 돌려주지 않으면 날짜와 수량을 다 채운 폼이 오류 한 줄과 함께 비워진다.
   * 화면은 이 값을 `defaultValue` 로 다시 심는다.
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
 * 폼에서 되돌려 줄 값만 골라 담는다.
 *
 * 비밀번호처럼 돌려주면 안 되는 값이 섞이지 않도록 필드를 명시적으로 나열한다.
 */
export function formValues(formData: FormData, fields: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const value = formData.get(field);
    if (typeof value === 'string') values[field] = value;
  }
  return values;
}
