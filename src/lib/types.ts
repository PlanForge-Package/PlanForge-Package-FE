/** BE 가 내려주는 응답 형태. 원본은 BE 의 `prisma/schema.prisma` 및 Swagger(/docs). */

export type ReservationStatus =
  'RESERVED' | 'CONFIRMED' | 'IN_HOUSE' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW' | 'WAITLISTED';

export type RoomStatus = 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_ORDER' | 'OUT_OF_SERVICE';

export interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  vip: boolean;
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
