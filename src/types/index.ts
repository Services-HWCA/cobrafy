import type { Timestamp } from "firebase/firestore";

export type ClientStatus = "active" | "settled" | "archived";

export type PaymentStatus = "active" | "voided";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  currency: string;
  dateFormat: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  description: string;
  initialDebt: number;
  totalPaid: number;
  balance: number;
  status: ClientStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type DebtStatus = "onTime" | "dueSoon" | "overdue" | "settled";

export type InterestFrequency = "monthly" | "weekly" | "daily";
export type InterestCalculation = "simple" | "compound";

export interface InterestConfig {
  enabled: boolean;
  rate: number;
  frequency: InterestFrequency;
  calculation: InterestCalculation;
  graceDays: number;
}

export interface Debt {
  id: string;
  clientId: string;
  label: string;
  initialAmount: number;
  principalPaid: number;
  dueDate: string | null;
  interest: InterestConfig;
  accruedInterest: number;
  outstandingBalance: number;
  status: DebtStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface InterestEntry {
  id: string;
  debtId: string;
  amount: number;
  rate: number;
  periodStart: string;
  periodEnd: string;
  appliedAt: Timestamp;
  calculationType: InterestCalculation;
}

export interface Payment {
  id: string;
  clientId: string;
  clientName?: string;
  debtId?: string;
  debtLabel?: string;
  amount: number;
  date: Timestamp;
  note: string;
  status: PaymentStatus;
  createdAt: Timestamp | null;
  voidedAt: Timestamp | null;
  voidReason: string;
}
