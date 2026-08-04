/** Response shapes from BE. The source is BE's `prisma/schema.prisma` and Swagger (/docs). */

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

/** The full profile used in lists and detail. Wider than the Profile on a reservation. */
export interface GuestProfile extends Profile {
  operaProfileId: string | null;
  type: ProfileType;
  companyName: string | null;
  phone: string | null;
  nationality: string | null;
  membershipNumber: string | null;
  membershipTier: MembershipTier;
  /** Preference codes, not free text — the wording is the screen's job. */
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
  /** Why they were matched. Nothing is merged automatically; a person decides. */
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
  /** Block code, if the reservation was picked up from a group block */
  blockCode?: string | null;
  /** Group of reservations sharing a room. Two reservations, one room. */
  shareGroupId?: string | null;
  /** Where the booking came from. Three separate axes keep combinations distinct. */
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

/** Inventory BE fetched from OPERA through Core. Not a figure we computed. */
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

export interface RateOfferPackage {
  packageCode: string;
  name: string;
  amount: number;
  calculation: string;
  /** Included in the rate means the total does not grow. */
  includedInRate: boolean;
}

export interface RateOffer {
  ratePlanCode: string;
  ratePlanName?: string;
  roomTypeCode: string;
  roomTypeName?: string;
  currency: string;
  nightlyRates: Array<{ date: string; amount: number; packageAmount?: number }>;
  packages?: RateOfferPackage[];
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

// --- Rate code setup. OPERA owns it, so there is no local copy ---------------

export interface RateSeason {
  seasonId: string;
  name: string;
  startDate: string;
  endDate: string;
  /** 0=Sunday. Empty means every day in the range. */
  daysOfWeek?: number[];
  amounts: Record<string, number>;
}

/**
 * OPERA's rate code setup.
 *
 * Different from the `RatePlan` on a reservation (a local copy) — this is the setup
 * for what sells at what price; that is a record of what a booking was sold on.
 */
export interface RatePlanConfig {
  ratePlanCode: string;
  hotelId: string;
  name: string;
  description?: string;
  currency: string;
  marketCode: string;
  sellStartDate: string;
  sellEndDate: string;
  baseAmounts: Record<string, number>;
  seasons: RateSeason[];
  packageCodes: string[];
  status: string;
}

export interface RatePlanConfigList {
  propertyId: string;
  items: RatePlanConfig[];
}

export interface RatePackage {
  packageCode: string;
  hotelId: string;
  name: string;
  amount: number;
  /** PerNight = per night, PerStay = once per stay, PerPerson = per person per night. */
  calculation: string;
  transactionCode: string;
  includedInRate: boolean;
}

/** A reservation's guarantee, cancellation terms and deposit. The guest hears this before we cancel. */
export interface ReservationPolicies {
  reservationId: string;
  guaranteeCode: string;
  currency: string;
  cancellation: {
    policyName: string;
    /** Cancelling is free until this moment. */
    freeUntil: string;
    withinFreeWindow: boolean;
    penaltyAmount: number;
  };
  deposit: {
    requiredAmount: number;
    dueDate?: string;
    paidAmount: number;
  };
}

// --- Close journal -----------------------------------------------------------

export interface JournalCode {
  transactionCode: string;
  name: string;
  group: string;
  count: number;
  /** Displayed price. Korean hotels sell tax-inclusive. */
  gross: string;
  net: string;
  serviceCharge: string;
  vat: string;
  /** A code missing from the transaction code setup. A person has to place it. */
  unmapped: boolean;
}

export interface JournalGroup {
  group: string;
  label: string;
  count: number;
  gross: string;
  net: string;
  serviceCharge: string;
  vat: string;
  codes: JournalCode[];
}

export interface JournalReport {
  propertyId: string;
  date: string;
  revenue: {
    groups: JournalGroup[];
    total: { count: number; gross: string; net: string; serviceCharge: string; vat: string };
  };
  unmappedCodes: string[];
  payments: {
    methods: Array<{ method: string; count: number; amount: string }>;
    total: string;
  };
  ledger: {
    openingBalance: string;
    charges: string;
    payments: string;
    closingBalance: string;
    /** Sum of open folio balances. Must match the closing balance. */
    outstanding: string;
    balanced: boolean;
  };
}

export interface RatePackageList {
  propertyId: string;
  items: RatePackage[];
}

export type BlockStatus = 'INQUIRY' | 'TENTATIVE' | 'DEFINITE' | 'CANCELLED' | 'ACTUAL';

export interface BlockAllotment {
  id: string;
  date: string;
  roomTypeCode: string;
  /** Rooms held */
  blocked: number;
  /** Rooms actually picked up */
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

/** Rooming list. Reservations are read straight from OPERA, so the shape differs from local ones. */
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

/** Amounts are Prisma Decimal and arrive as strings in JSON, to keep the precision. */
export interface DailyReportRow {
  date: string;
  roomsAvailable: number;
  roomsSold: number;
  /** Bookings not yet arrived. Kept apart from performance. */
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
  /** Share of total sales. Channel dependence at a glance. */
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
  /** Breakdown by channel, source and market. Sums to totals. */
  breakdown: {
    channel: BreakdownRow[];
    source: BreakdownRow[];
    market: BreakdownRow[];
  };
  /** What actually posted to the folio. Different from contracted revenue. */
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
  /** Prisma Decimal arrives as a string in JSON. */
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
  /** False means OPERA was unreachable and the calendar date stood in. */
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
  /** Prisma Decimal arrives as a string in JSON. It carries a sign. */
  amount: string;
  currency: string;
  postedAt: string;
  /** Outlet, if an outside POS posted the charge. Null when the front desk did. */
  outletId?: string | null;
  /** POS check number */
  reference?: string | null;
  /** Id of the adjustment that voided it, if voided */
  voidedById?: string | null;
  /** Payment id, if a PSP payment created it. Such a posting cannot be transferred. */
  paymentId?: string | null;
  /** Original window, if transferred in */
  transferredFromWindow?: number | null;
  transferredAt?: string | null;
}

/** Department a trace goes to. Not a role — maintenance has no role but still gets instructions. */
export type TraceDepartment = 'FRONT_DESK' | 'HOUSEKEEPING' | 'MAINTENANCE' | 'FNB' | 'RESERVATION';

export type TraceStatus = 'PENDING' | 'DONE';

export interface ReservationTrace {
  id: string;
  reservationId: string;
  department: TraceDepartment;
  dueDate: string;
  note: string;
  status: TraceStatus;
  completedAt: string | null;
  reservation: {
    id: string;
    confirmationNumber: string | null;
    assignedRoomNumber: string | null;
    profile: { lastName: string | null; firstName: string | null };
  };
  createdBy: { id: string; name: string } | null;
  completedBy: { id: string; name: string } | null;
}

export interface TraceList {
  items: ReservationTrace[];
  total: number;
}

export interface DailyTraceList extends TraceList {
  date: string;
}

/** Cashier shift totals. Every amount is a string — Decimal arrives as a string in JSON. */
export interface CashierSummary {
  openingFloat: string;
  byMethod: Record<PaymentMethod, string>;
  collected: string;
  /** Cash that should be in the drawer = opening float + cash received */
  expectedCash: string;
  countedCash: string | null;
  /** Counted minus expected. Positive is over, negative is short. Null before close. */
  difference: string | null;
  paymentCount: number;
}

export interface CashierShift {
  id: string;
  propertyId: string;
  userId: string;
  openedAt: string;
  closedAt: string | null;
  openingFloat: string;
  countedCash: string | null;
  notes: string | null;
  user: { id: string; name: string; role: UserRole };
}

export interface CashierCurrent {
  shift: CashierShift | null;
  summary: CashierSummary | null;
}

export interface CashierShiftList {
  items: Array<CashierShift & { summary: CashierSummary }>;
  total: number;
}

/** Routing instruction — the window a transaction code's charges go to. */
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
  /** Prisma Decimal arrives as a string in JSON. */
  amount: string;
  refundedAmount: string;
  currency: string;
  vendorTxnId: string | null;
  approvalNumber: string | null;
  /** Last four only. The full card number is never stored. */
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
  /** In mock mode no money actually moves. The screen has to say so. */
  driverMode: 'mock' | 'live';
  items: Payment[];
}

export type RoomKeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface RoomKey {
  id: string;
  roomNumber: string;
  /** Vendor's card id */
  vendorKeyId: string;
  validFrom: string;
  validUntil: string;
  status: RoomKeyStatus;
  /** Which issue this is. Frequent reissues are worth a look. */
  sequence: number;
  issuedAt: string;
  issuedByName: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface RoomKeyListResponse {
  reservationId: string;
  roomNumber: string | null;
  /** In mock mode this key opens no door. The screen has to say so. */
  driverMode: 'mock' | 'live';
  items: RoomKey[];
}

export interface PosOutlet {
  id: string;
  propertyId: string;
  code: string;
  name: string;
  transactionCode: string;
  /** Key prefix. The full key exists only at the moment it is issued. */
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
 * Room outage.
 *
 * `OUT_OF_ORDER` leaves inventory and so shrinks the occupancy denominator;
 * `OUT_OF_SERVICE` is merely not for sale and the denominator holds.
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

// --- AR / city ledger --------------------------------------------------------

export type ArTransactionType = 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT';
export type ArInvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'VOID';

export interface ArAccount {
  id: string;
  propertyId: string;
  code: string;
  name: string;
  profileId: string | null;
  /** Credit limit. Null means none. */
  creditLimit: string | null;
  termDays: number;
  billingEmail: string | null;
  notes: string | null;
  active: boolean;
  profile: {
    id: string;
    companyName: string | null;
    lastName: string | null;
    firstName: string | null;
  } | null;
}

export interface ArAccountList {
  items: Array<ArAccount & { balance: string }>;
  total: number;
}

export interface ArTransaction {
  id: string;
  type: ArTransactionType;
  /** Signed value. Charges are positive, payments negative. */
  amount: string;
  currency: string;
  description: string;
  postedAt: string;
  folioWindow: number | null;
  invoice: { id: string; number: string; status: ArInvoiceStatus } | null;
  reservation: { id: string; confirmationNumber: string | null } | null;
}

export interface ArInvoice {
  id: string;
  number: string;
  status: ArInvoiceStatus;
  total: string;
  currency: string;
  issuedAt: string;
  dueDate: string;
  note: string | null;
  /** Total payments applied to this invoice */
  paid: string;
  /** Still unpaid. This is the amount to chase. */
  outstanding: string;
  overdue: boolean;
}

export interface ArAccountDetail {
  account: ArAccount;
  /** Outstanding balance. The sum of transactions. */
  balance: string;
  /** Amount not yet on an invoice */
  unbilled: string;
  transactions: ArTransaction[];
  invoices: ArInvoice[];
}

/** Invoice document. The material for what is sent to the account as is. */
export interface ArInvoiceDetail extends ArInvoice {
  propertyId: string;
  accountId: string;
  sentAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  account: ArAccount;
  property: { id: string; name: string; address: string | null; currency: string };
  transactions: ArTransaction[];
  allocations: Array<{
    id: string;
    amount: string;
    createdAt: string;
    payment: { id: string; description: string; postedAt: string };
  }>;
}

export interface ArAgingBuckets {
  current: string;
  days30: string;
  days60: string;
  days90: string;
  over90: string;
}

export interface ArAgingRow {
  account: { id: string; code: string; name: string; billingEmail: string | null };
  total: string;
  overdue: string;
  buckets: ArAgingBuckets;
  invoices: Array<{
    id: string;
    number: string;
    dueDate: string;
    status: ArInvoiceStatus;
    total: string;
    paid: string;
    outstanding: string;
    daysOverdue: number;
  }>;
}

export interface ArAging {
  asOf: string;
  items: ArAgingRow[];
  totals: ArAgingBuckets & { total: string; overdue: string };
}
