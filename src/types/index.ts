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

export interface Payment {
  id: string;
  clientId: string;
  clientName?: string;
  amount: number;
  date: Timestamp;
  note: string;
  status: PaymentStatus;
  createdAt: Timestamp | null;
  voidedAt: Timestamp | null;
  voidReason: string;
}
