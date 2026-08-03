/**
 * 예약 경로 코드의 표기.
 *
 * 코드는 OPERA 설정이 정하고 표기만 화면이 맡는다. 여기 없는 코드가 와도
 * 코드 그대로 보여 주면 되지, 감추면 그 예약이 어디서 왔는지 알 수 없게 된다.
 */
export const SOURCE_LABELS: Record<string, string> = {
  DIRECT: '직접',
  PHONE: '전화',
  WALKIN: '워크인',
  OTA: 'OTA',
  GDS: 'GDS',
  CORPORATE: '법인 계약',
};

export const MARKET_LABELS: Record<string, string> = {
  TRANSIENT: '개인',
  CORPORATE: '법인',
  GROUP: '단체',
  LEISURE: '레저',
  GOVERNMENT: '관공서',
};

export const CHANNEL_LABELS: Record<string, string> = {
  WEB: '자사 웹',
  MOBILE: '자사 앱',
  BOOKINGCOM: 'Booking.com',
  EXPEDIA: 'Expedia',
  AGODA: 'Agoda',
  YANOLJA: '야놀자',
  FRONTDESK: '프런트',
};

/** 모르는 코드는 그대로 보여 준다. 빈 값만 대시로 바꾼다. */
export function label(map: Record<string, string>, code: string | null | undefined): string {
  if (!code) return '—';
  return map[code] ?? code;
}
