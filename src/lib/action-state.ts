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
}

export const IDLE: ActionState = { status: 'idle', message: '' };

export function actionError(message: string): ActionState {
  return { status: 'error', message };
}

export function actionSuccess(message: string): ActionState {
  return { status: 'success', message };
}
