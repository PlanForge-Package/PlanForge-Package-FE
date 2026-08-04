/** BE 가 내려주는 응답 형태. 원본은 BE 의 `prisma/schema.prisma` 및 Swagger(/docs). */

export type ReservationStatus =
  'RESERVED' | 'CONFIRMED' | 'IN_HOUSE' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW' | 'WAITLISTED';

export type RoomStatus = 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_ORDER' | 'OUT_OF_SERVICE';

export type ProfileType = 'GUEST' | 'COMPANY' | 'TRAVEL_AGENT' | 'GROUP';

export type MembershipTier = 'NONE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  vip: boolean;
}

/** 목록·상세에서 쓰는 전체 프로필. 예약에 딸려 오는 Profile 보다 넓다. */
export interface GuestProfile extends Profile {
  operaProfileId: string | null;
  type: ProfileType;
  companyName: string | null;
  phone: string | null;
  nationality: string | null;
  membershipNumber: string | null;
  membershipTier: MembershipTier;
  /** 선호 코드. 자유 텍스트가 아니다 — 표기는 화면이 맡는다. */
  preferences: string[];
  notes: string | null;
  mergedIntoId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileListResponse {
  items: GuestProfile[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProfileStay {
  id: string;
  confirmationNumber: string;
  status: ReservationStatus;
  arrivalDate: string;
  departureDate: string;
  totalAmount: string | null;
  currency: string;
  assignedRoomNumber: string | null;
  property: { name: string };
  roomType: { code: string };
}

export interface ProfileDetail extends GuestProfile {
  merged: boolean;
  mergedInto: { id: string; firstName: string | null; lastName: string | null } | null;
  stays: ProfileStay[];
  summary: {
    stayCount: number;
    nights: number;
    revenue: string;
    lastStay: string | null;
  };
}

export type DuplicateReason = 'SAME_EMAIL' | 'SAME_PHONE' | 'SAME_NAME' | 'SAME_MEMBERSHIP';

export interface DuplicateCandidate {
  profile: GuestProfile;
  /** 같은 사람으로 본 근거. 자동으로 합치지 않고 사람이 판단한다. */
  reasons: DuplicateReason[];
}

export interface DuplicateResponse {
  profileId: string;
  items: DuplicateCandidate[];
}

export interface RoomType {
  id: string;
  code: string;
  name: string;
}

export interface RatePlan {
  id: string;
  code: string;
  name: string;
}

export interface Property {
  id: string;
  operaHotelId: string;
  name: string;
  currency: string;
  timezone?: string;
  address?: string | null;
  active?: boolean;
}

export interface Reservation {
  id: string;
  confirmationNumber: string;
  operaReservationId: string | null;
  status: ReservationStatus;
  arrivalDate: string;
  departureDate: string;
  adults: number;
  children: number;
  assignedRoomNumber: string | null;
  /** 단체 블록에서 빠져나온 예약이면 그 블록 코드 */
  blockCode?: string | null;
  /** 예약이 들어온 경로. 세 축을 따로 두어야 조합을 구분할 수 있다. */
  sourceCode?: string | null;
  marketCode?: string | null;
  channelCode?: string | null;
  totalAmount: string | null;
  currency: string;
  profile: Profile;
  roomType: RoomType;
  ratePlan: RatePlan | null;
  property: Property;
}

/** BE 가 Core 를 거쳐 OPERA 에서 받아 온 재고. 우리가 계산한 값이 아니다. */
export interface AvailabilityItem {
  roomTypeCode: string;
  roomTypeName?: string;
  availableRooms: number;
  ratePlanCode?: string;
  amount?: number;
  currency?: string;
}

export interface AvailabilityResponse {
  propertyId: string;
  hotelId: string;
  arrivalDate: string;
  departureDate: string;
  items: AvailabilityItem[];
}

export interface RateOffer {
  ratePlanCode: string;
  roomTypeCode: string;
  roomTypeName?: string;
  currency: string;
  nightlyRates: Array<{ date: string; amount: number }>;
  totalAmount: number;
}

export interface RateResponse {
  propertyId: string;
  hotelId: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  offers: RateOffer[];
}

export type BlockStatus = 'INQUIRY' | 'TENTATIVE' | 'DEFINITE' | 'CANCELLED' | 'ACTUAL';

export interface BlockAllotment {
  id: string;
  date: string;
  roomTypeCode: string;
  /** 잡아 둔 객실 수 */
  blocked: number;
  /** 실제 예약으로 빠져나간 수 */
  pickedUp: number;
  ratePlanCode: string | null;
  amount: string | null;
}

export interface Block {
  id: string;
  operaBlockId: string | null;
  propertyId: string;
  code: string;
  name: string;
  status: BlockStatus;
  startDate: string;
  endDate: string;
  cutoffDate: string | null;
  currency: string;
  totalBlocked: number;
  totalPickedUp: number;
  allotments: BlockAllotment[];
}

/** 룸리스트. 예약은 OPERA 에서 바로 읽으므로 로컬 예약 형태와 다르다. */
export interface BlockReservation {
  reservationId: string;
  confirmationNumber?: string;
  status: string;
  arrivalDate: string;
  departureDate: string;
  roomTypeCode?: string;
  roomNumber?: string;
  adults?: number;
  totalAmount?: number;
  currency?: string;
  guest?: { firstName?: string; lastName?: string; email?: string };
}

export interface BlockRoomingList {
  blockId: string;
  code: string;
  items: BlockReservation[];
}

/** 금액은 Prisma Decimal 이라 JSON 에서 문자열로 온다. 정밀도를 잃지 않기 위해서다. */
export interface DailyReportRow {
  date: string;
  roomsAvailable: number;
  roomsSold: number;
  /** 아직 도착하지 않은 예약분. 실적과 섞지 않는다. */
  roomsBooked: number;
  occupancy: number;
  roomRevenue: string;
  adr: string;
  revpar: string;
}

export interface BreakdownRow {
  code: string;
  roomsSold: number;
  roomRevenue: string;
  adr: string;
  /** 전체 판매에서 차지하는 비중. 채널 의존도를 한눈에 본다. */
  share: number;
}

export interface DailyReport {
  propertyId: string;
  currency: string;
  from: string;
  to: string;
  nights: number;
  roomsAvailable: number;
  basis: string;
  totals: {
    roomsSold: number;
    roomsAvailable: number;
    occupancy: number;
    roomRevenue: string;
    adr: string;
    revpar: string;
  };
  /** 채널·출처·시장별 분해. 합계는 totals 와 같다. */
  breakdown: {
    channel: BreakdownRow[];
    source: BreakdownRow[];
    market: BreakdownRow[];
  };
  /** 폴리오에 실제로 올라간 금액. 계약 기준 매출과 다른 값이다. */
  postings: {
    charges: string;
    payments: string;
    adjustments: string;
    outstanding: string;
  };
  rows: DailyReportRow[];
}

export type AuditItemKind =
  | 'ARRIVAL_PENDING'
  | 'DEPARTURE_PENDING'
  | 'IN_HOUSE_UNASSIGNED'
  | 'OPEN_BALANCE'
  | 'ROOM_DISCREPANCY';

export interface AuditItem {
  reservationId: string | null;
  confirmationNumber: string | null;
  guest: string | null;
  date: string | null;
  roomTypeCode: string | null;
  roomNumber: string | null;
  /** Prisma Decimal 은 JSON 에서 문자열로 온다. */
  amount: string | null;
}

export interface AuditSection {
  kind: AuditItemKind;
  label: string;
  hint: string;
  items: AuditItem[];
}

export interface NightAuditReview {
  propertyId: string;
  businessDate: string;
  /** false 면 OPERA 에 닿지 못해 달력 날짜로 대신한 것이다. */
  businessDateFromOpera: boolean;
  calendarDate: string;
  outstanding: number;
  ready: boolean;
  sections: AuditSection[];
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'INSPECTED';

export interface HousekeepingTask {
  id: string;
  propertyId: string;
  roomId: string;
  assignedToId: string | null;
  date: string;
  status: TaskStatus;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  room: Room;
  assignedTo: { id: string; name: string; role: UserRole } | null;
}

export interface TaskListResponse {
  date: string;
  items: HousekeepingTask[];
  total: number;
}

export type DiscrepancyKind =
  'OCCUPIED_WITHOUT_RESERVATION' | 'RESERVATION_WITHOUT_OCCUPANCY' | 'OCCUPIED_BUT_CLEAN';

export interface Discrepancy {
  room: Room;
  kind: DiscrepancyKind;
  reservation: string | null;
}

export interface DiscrepancyResponse {
  propertyId: string;
  total: number;
  items: Discrepancy[];
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'FRONT_DESK' | 'HOUSEKEEPING';

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  propertyId: string | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  items: ManagedUser[];
  total: number;
  limit: number;
  offset: number;
}

export type PostingType = 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT' | 'TAX';

export type FolioStatus = 'OPEN' | 'CLOSED';

export interface Posting {
  id: string;
  type: PostingType;
  transactionCode: string;
  description: string;
  /** Prisma Decimal 은 JSON 에서 문자열로 온다. 부호가 붙어 있다. */
  amount: string;
  currency: string;
  postedAt: string;
  /** 외부 POS 가 단 요금이면 그 아웃렛. 프런트가 직접 올린 것은 null. */
  outletId?: string | null;
  /** POS 전표 번호 */
  reference?: string | null;
  /** 취소되었으면 그 취소를 만든 조정 포스팅 ID */
  voidedById?: string | null;
  /** PG 결제가 만든 거래면 그 결제 ID. 이관할 수 없다. */
  paymentId?: string | null;
  /** 다른 창구에서 옮겨 왔으면 원래 창구 */
  transferredFromWindow?: number | null;
  transferredAt?: string | null;
}

/** 라우팅 지시 — 거래 코드별로 요금을 보낼 창구. */
export interface FolioRouting {
  id: string;
  reservationId: string;
  transactionCode: string;
  targetWindow: number;
  note: string | null;
  createdAt: string;
}

export interface FolioRoutingList {
  items: FolioRouting[];
  total: number;
}

export type PaymentMethod = 'CARD' | 'CASH' | 'TRANSFER';

export type PaymentStatus = 'AUTHORIZED' | 'CAPTURED' | 'VOIDED' | 'REFUNDED' | 'FAILED';

export interface Payment {
  id: string;
  folioId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  /** Prisma Decimal 은 JSON 에서 문자열로 온다. */
  amount: string;
  refundedAmount: string;
  currency: string;
  vendorTxnId: string | null;
  approvalNumber: string | null;
  /** 뒷 네 자리만. 전체 카드 번호는 저장하지 않는다. */
  maskedCard: string | null;
  cardBrand: string | null;
  failureReason: string | null;
  authorizedAt: string;
  capturedAt: string | null;
  voidedAt: string | null;
  folio?: { window: number };
}

export interface PaymentListResponse {
  reservationId: string;
  /** mock 이면 실제로 돈이 오가지 않는다. 화면이 알려야 한다. */
  driverMode: 'mock' | 'live';
  items: Payment[];
}

export type RoomKeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface RoomKey {
  id: string;
  roomNumber: string;
  /** 벤더 시스템의 카드 식별자 */
  vendorKeyId: string;
  validFrom: string;
  validUntil: string;
  status: RoomKeyStatus;
  /** 몇 번째 발급인지. 재발급이 잦으면 확인할 이유가 된다. */
  sequence: number;
  issuedAt: string;
  issuedByName: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface RoomKeyListResponse {
  reservationId: string;
  roomNumber: string | null;
  /** mock 이면 이 키로는 어떤 문도 열리지 않는다. 화면이 알려야 한다. */
  driverMode: 'mock' | 'live';
  items: RoomKey[];
}

export interface PosOutlet {
  id: string;
  propertyId: string;
  code: string;
  name: string;
  transactionCode: string;
  /** 키 앞자리. 전체 키는 발급 순간에만 존재한다. */
  apiKeyPrefix: string;
  keyIssuedAt: string;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface OutletListResponse {
  items: PosOutlet[];
}

export interface Folio {
  id: string;
  window: number;
  status: FolioStatus;
  balance: string;
  currency: string;
  postings: Posting[];
}

export interface ReservationDetail extends Reservation {
  notes: string | null;
  folios: Folio[];
}

export interface ReservationListResponse {
  items: Reservation[];
  total: number;
  limit: number;
  offset: number;
}

export interface Room {
  id: string;
  number: string;
  floor: string | null;
  status: RoomStatus;
  occupied: boolean;
  roomType: RoomType;
}

/**
 * 사용 불가 객실.
 *
 * `OUT_OF_ORDER` 는 재고에서 빠져 점유율의 분모도 줄이고, `OUT_OF_SERVICE` 는
 * 팔지 않을 뿐 재고에는 남아 분모가 그대로다.
 */
export type RoomOutageKind = 'OUT_OF_ORDER' | 'OUT_OF_SERVICE';

export interface RoomOutage {
  id: string;
  propertyId: string;
  roomId: string;
  operaId: string;
  kind: RoomOutageKind;
  startDate: string;
  endDate: string;
  reason: string;
  returnStatus: RoomStatus;
  releasedAt: string | null;
  room: {
    id: string;
    number: string;
    floor: string | null;
    roomType: { code: string };
  };
  createdBy: { id: string; name: string } | null;
}

export interface RoomOutageList {
  items: RoomOutage[];
  total: number;
}

export interface RoomStatusSummary {
  propertyId: string;
  total: number;
  occupied: number;
  vacant: number;
  byStatus: Record<RoomStatus, number>;
}

export interface DailySummary {
  propertyId: string;
  date: string;
  arrivals: number;
  departures: number;
  inHouse: number;
}
