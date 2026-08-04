/**
 * 한국어 사전 — 기준이 되는 사전.
 *
 * 다른 언어는 이 모양을 그대로 따른다. 키를 여기서만 늘리면 나머지 언어에서
 * 빠진 항목이 타입 오류로 드러난다.
 */
export const ko = {
  common: {
    appName: 'PlanForge',
    language: '언어',
    loading: '불러오는 중…',
    save: '저장',
    cancel: '취소',
    search: '조회',
    close: '닫기',
    logout: '로그아웃',
    noAccess: '접근 가능한 호텔이 없습니다. 관리자에게 소속 지정을 요청해 주세요.',
  },
  roles: {
    ADMIN: '관리자',
    MANAGER: '지배인',
    FRONT_DESK: '프론트데스크',
    HOUSEKEEPING: '하우스키핑',
  },
  nav: {
    dashboard: '대시보드',
    reservations: '예약',
    blocks: '단체',
    profiles: '게스트',
    rooms: '객실',
    rates: '요금',
    housekeeping: '하우스키핑',
    nightAudit: '야간 감사',
    cashier: '캐셔 마감',
    ar: 'AR',
    reports: '실적',
    pos: 'POS',
    users: '계정',
    account: '내 계정',
    menu: '주 메뉴',
  },
  login: {
    title: '로그인',
    subtitle: 'PlanForge 호텔 관리 플랫폼',
    email: '이메일',
    password: '비밀번호',
    submit: '로그인',
    pending: '확인 중…',
    failed: '이메일 또는 비밀번호가 올바르지 않습니다.',
    expired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  },
  dashboard: {
    title: '대시보드',
    description: '오늘의 도착·출발·재실과 객실 상태입니다.',
    arrivals: '도착 예정',
    departures: '출발 예정',
    inHouse: '재실',
    availableRooms: '판매 가능 객실',
    roomStatus: '객실 상태',
    todayTraces: '오늘의 지시',
    loadFailed: '요약을 불러오지 못했습니다',
    totalReservations: '전체 예약',
    checkedOut: '체크아웃',
    reservationSummary: '예약 요약',
    shortcuts: '바로 가기',
    tracesFailed: '오늘의 지시를 불러오지 못했습니다',
  },
};

/**
 * 사전의 모양.
 *
 * `as const` 를 쓰지 않는다 — 값까지 리터럴 타입이 되면 다른 언어의 번역문이
 * 한국어 문자열과 다르다는 이유로 타입 오류가 난다. 여기서 잡고 싶은 것은 값이
 * 아니라 빠진 키다.
 */
export type Dictionary = typeof ko;
