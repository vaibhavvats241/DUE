/**
 * DUE — Friends Khata
 * Domain types with integer paise precision
 */

export interface AppUser {
  id: string;
  name: string;
  email?: string;
  avatarColor?: string;
}

export interface GroupMember {
  userId: string;
  name: string;
  email?: string;
  role?: string;
  joinedAt: number;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  members: GroupMember[];
}

export interface DueAllocation {
  userId: string;
  userName: string;
  amountPaise: number; // Integer paise: e.g. 70000 = ₹700.00
}

export type ExpenseStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  totalAmountPaise: number; // Sum of dues MUST equal this exactly
  payerId: string;
  payerName: string;
  createdById: string;
  createdByName: string;
  status: ExpenseStatus;
  dues: DueAllocation[];
  createdAt: number;
  confirmedAt?: number;
  rejectedAt?: number;
}

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface Payment {
  id: string;
  groupId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string; // The receiver who must approve
  toUserName: string;
  amountPaise: number; // Integer paise
  note?: string;
  createdAt: number;
  recordedById?: string;
  status: PaymentStatus;
  confirmedAt?: number;
  rejectedAt?: number;
  rejectReason?: string;
}

export interface SettlementDebt {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amountPaise: number;
}

export interface MemberBalance {
  userId: string;
  name: string;
  totalPaidPaise: number;     // Total spent as confirmed payer
  totalOwedPaise: number;     // Total dues allocated to them in confirmed expenses
  totalPaymentsSentPaise: number;     // Confirmed direct payments paid to others
  totalPaymentsReceivedPaise: number; // Confirmed direct payments received from others
  netBalancePaise: number;    // Positive = owes money (Due), Negative = is owed money (Credit)
  totalDirectOwedToOthersPaise?: number;   // Total sum of direct dues this member owes directly to individual friends
  totalDirectOwedFromOthersPaise?: number; // Total sum of direct dues friends owe directly to this member
}
