/**
 * 예약 경로 코드의 표기.
 *
 * 코드는 OPERA 설정이 정하고 표기만 화면이 맡는다. 표기는 사전에 있어 화면
 * 언어를 따라가고, 여기서는 모르는 코드를 어떻게 다룰지만 정한다.
 */

/** 모르는 코드는 그대로 보여 준다. 감추면 그 예약이 어디서 왔는지 알 수 없다. */
export function label(map: Record<string, string>, code: string | null | undefined): string {
  if (!code) return '—';
  return map[code] ?? code;
}
