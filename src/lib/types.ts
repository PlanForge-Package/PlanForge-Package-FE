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
  totalAmount: string | null;
  currency: string;
  profile: Profile;
  roomType: RoomType;
  ratePlan: RatePlan | null;
  property: Property;
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
