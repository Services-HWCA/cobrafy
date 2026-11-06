import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { clientDoc, getClient } from "@/lib/services/client.service";
import type { Client, Debt, DebtStatus, InterestConfig, InterestEntry, InterestFrequency, InterestCalculation } from "@/types";

const LEGACY_DEBT_ID = "deuda-original";

function debtsCollection(uid: string, clientId: string) {
  return collection(getFirebaseDb(), "users", uid, "clients", clientId, "debts");
}

function debtDoc(uid: string, clientId: string, debtId: string) {
  return doc(getFirebaseDb(), "users", uid, "clients", clientId, "debts", debtId);
}

function interestEntriesCollection(uid: string, clientId: string, debtId: string) {
  return collection(getFirebaseDb(), "users", uid, "clients", clientId, "debts", debtId, "interestEntries");
}

function interestEntryDoc(uid: string, clientId: string, debtId: string, entryId: string) {
  return doc(getFirebaseDb(), "users", uid, "clients", clientId, "debts", debtId, "interestEntries", entryId);
}

function debtFromSnapshot(id: string, clientId: string, data: DocumentData): Debt {
  const interest = data.interest || {};
  return {
    id,
    clientId,
    label: data.label || "Deuda",
    initialAmount: Number(data.initialAmount || 0),
    principalPaid: Number(data.principalPaid || 0),
    dueDate: typeof data.dueDate === "string" && data.dueDate ? data.dueDate : null,
    interest: {
      enabled: Boolean(interest.enabled),
      rate: Number(interest.rate || 0),
      frequency: (interest.frequency || "monthly") as InterestFrequency,
      calculation: (interest.calculation || "simple") as InterestCalculation,
      graceDays: Number(interest.graceDays || 0),
    },
    accruedInterest: Number(data.accruedInterest || 0),
    outstandingBalance: Number(data.outstandingBalance || 0),
    status: (data.status || "onTime") as DebtStatus,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

function timeOf(value: { toMillis?: () => number } | null): number {
  return value && typeof value.toMillis === "function" ? value.toMillis() : 0;
}

export function localTodayString(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function calculateDebtStatus(debt: Debt, today: string = localTodayString()): DebtStatus {
  if (debt.outstandingBalance === 0) return "settled";
  if (!debt.dueDate) return "onTime";
  const graceDueDate = addDays(debt.dueDate, debt.interest.graceDays);
  if (today > graceDueDate) return "overdue";
  const warningDate = addDays(debt.dueDate, -3);
  if (today >= warningDate) return "dueSoon";
  return "onTime";
}

export function calculatePendingInterest(debt: Debt, today: string = localTodayString()): number {
  if (!debt.interest.enabled || debt.interest.rate <= 0 || debt.outstandingBalance <= 0) return 0;
  if (!debt.dueDate) return 0;
  const graceDueDate = addDays(debt.dueDate, debt.interest.graceDays);
  if (today <= graceDueDate) return 0;

  const base = debt.outstandingBalance;
  const rate = debt.interest.rate / 100;
  const principal = debt.initialAmount - debt.principalPaid;

  if (debt.interest.calculation === "simple") {
    return Math.round(base * rate);
  } else {
    return Math.round(principal * rate);
  }
}

async function migrateLegacyDebt(uid: string, client: Client): Promise<void> {
  if (client.initialDebt <= 0) return;

  const ref = debtDoc(uid, client.id, LEGACY_DEBT_ID);
  await runTransaction(getFirebaseDb(), async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) return;

    transaction.set(ref, {
      clientId: client.id,
      label: "Deuda original",
      initialAmount: client.initialDebt,
      principalPaid: client.totalPaid,
      dueDate: null,
      interest: {
        enabled: false,
        rate: 0,
        frequency: "monthly",
        calculation: "simple",
        graceDays: 0,
      },
      accruedInterest: 0,
      outstandingBalance: client.balance,
      status: client.balance === 0 ? "settled" : "onTime",
      createdAt: client.createdAt instanceof Timestamp ? client.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

async function applyInterest(
  uid: string,
  clientId: string,
  debtId: string,
  debt: Debt,
  today: string,
): Promise<void> {
  const interest = calculatePendingInterest(debt, today);
  if (interest <= 0) return;

  const db = getFirebaseDb();
  const clientRef = clientDoc(uid, clientId);
  const debtRef = debtDoc(uid, clientId, debtId);
  const entriesRef = interestEntriesCollection(uid, clientId, debtId);
  const entryRef = doc(entriesRef);

  await runTransaction(db, async (transaction) => {
    const [clientSnapshot, debtSnapshot] = await Promise.all([
      transaction.get(clientRef),
      transaction.get(debtRef),
    ]);
    if (!clientSnapshot.exists() || !debtSnapshot.exists()) return;

    const clientData = clientSnapshot.data() as Client;
    const debtData = debtSnapshot.data() as Debt;
    const currentInterest = Number(debtData.accruedInterest || 0);
    const currentBalance = Number(debtData.outstandingBalance || 0);

    transaction.update(debtRef, {
      accruedInterest: currentInterest + interest,
      outstandingBalance: currentBalance + interest,
      status: "overdue",
      updatedAt: serverTimestamp(),
    });

    transaction.update(clientRef, {
      initialDebt: Number(clientData.initialDebt || 0) + interest,
      balance: Number(clientData.balance || 0) + interest,
      updatedAt: serverTimestamp(),
    });

    transaction.set(entryRef, {
      debtId,
      amount: interest,
      rate: debt.interest.rate,
      periodStart: debt.dueDate || today,
      periodEnd: today,
      appliedAt: serverTimestamp(),
      calculationType: debt.interest.calculation,
    });
  });
}

async function fetchDebts(uid: string, client: Client): Promise<Debt[]> {
  const snapshot = await getDocs(debtsCollection(uid, client.id));
  const today = localTodayString();
  return snapshot.docs
    .map((item) => {
      const debt = debtFromSnapshot(item.id, client.id, item.data());
      return { ...debt, status: calculateDebtStatus(debt, today) };
    })
    .sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt) || a.label.localeCompare(b.label));
}

export async function listClientDebts(uid: string, client: Client): Promise<Debt[]> {
  let debts = await fetchDebts(uid, client);
  if (debts.length === 0) {
    await migrateLegacyDebt(uid, client);
    debts = await fetchDebts(uid, client);
  }

  const today = localTodayString();
  const pending = debts.filter((debt) => calculatePendingInterest(debt, today) > 0);
  if (pending.length > 0) {
    await Promise.all(pending.map((debt) => applyInterest(uid, client.id, debt.id, debt, today).catch(() => undefined)));
    debts = await fetchDebts(uid, client);
  }

  return debts;
}

export async function getClientDebt(
  uid: string,
  clientId: string,
  debtId: string,
): Promise<Debt | null> {
  const client = await getClient(uid, clientId);
  if (!client) return null;
  const debts = await listClientDebts(uid, client);
  return debts.find((debt) => debt.id === debtId) || null;
}

export interface DebtInput {
  label: string;
  amount: number;
  dueDate?: string;
  interestEnabled?: boolean;
  interestRate?: number;
  interestFrequency?: InterestFrequency;
  interestCalculation?: InterestCalculation;
  graceDays?: number;
}

export async function createDebt(
  uid: string,
  clientId: string,
  input: DebtInput,
): Promise<string> {
  const db = getFirebaseDb();
  const ref = clientDoc(uid, clientId);
  const debtsRef = debtsCollection(uid, clientId);

  return runTransaction(db, async (transaction) => {
    const clientSnapshot = await transaction.get(ref);
    if (!clientSnapshot.exists()) throw new Error("Cliente no encontrado");
    if (input.amount <= 0) throw new Error("El monto debe ser mayor a cero");

    const current = clientSnapshot.data() as Client;
    const debtRef = doc(debtsRef);
    const label = input.label.trim() || "Nuevo cobro";
    const today = localTodayString();

    transaction.set(debtRef, {
      clientId,
      label,
      initialAmount: input.amount,
      principalPaid: 0,
      dueDate: input.dueDate || null,
      interest: {
        enabled: Boolean(input.interestEnabled),
        rate: Math.max(0, Number(input.interestRate) || 0),
        frequency: input.interestFrequency || "monthly",
        calculation: input.interestCalculation || "simple",
        graceDays: Math.max(0, Number(input.graceDays) || 0),
      },
      accruedInterest: 0,
      outstandingBalance: input.amount,
      status: input.dueDate ? calculateDebtStatus({
        id: "",
        clientId,
        label,
        initialAmount: input.amount,
        principalPaid: 0,
        dueDate: input.dueDate,
        interest: {
          enabled: Boolean(input.interestEnabled),
          rate: Number(input.interestRate) || 0,
          frequency: input.interestFrequency || "monthly",
          calculation: input.interestCalculation || "simple",
          graceDays: Number(input.graceDays) || 0,
        },
        accruedInterest: 0,
        outstandingBalance: input.amount,
        status: "onTime",
        createdAt: null,
        updatedAt: null,
      }, today) : "onTime",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(ref, {
      initialDebt: Number(current.initialDebt || 0) + input.amount,
      balance: Number(current.balance || 0) + input.amount,
      status: current.status === "archived" ? "archived" : "active",
      updatedAt: serverTimestamp(),
    });

    return debtRef.id;
  });
}
