import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getClient, listClients } from "@/lib/services/client.service";
import { listClientDebts } from "@/lib/services/debt.service";
import type { Client, Debt, Payment } from "@/types";

function paymentsCollection(uid: string, clientId: string) {
  return collection(getFirebaseDb(), "users", uid, "clients", clientId, "payments");
}

function paymentDoc(uid: string, clientId: string, paymentId: string) {
  return doc(getFirebaseDb(), "users", uid, "clients", clientId, "payments", paymentId);
}

function debtDoc(uid: string, clientId: string, debtId: string) {
  return doc(getFirebaseDb(), "users", uid, "clients", clientId, "debts", debtId);
}

function clientDoc(uid: string, clientId: string) {
  return doc(getFirebaseDb(), "users", uid, "clients", clientId);
}

function paymentFromSnapshot(id: string, data: DocumentData): Payment {
  return {
    id,
    clientId: data.clientId || "",
    clientName: data.clientName || "",
    debtId: data.debtId || "",
    debtLabel: data.debtLabel || "",
    amount: Number(data.amount || 0),
    date: data.date,
    note: data.note || "",
    status: data.status || "active",
    createdAt: data.createdAt || null,
    voidedAt: data.voidedAt || null,
    voidReason: data.voidReason || "",
  };
}

export async function listClientPayments(uid: string, clientId: string): Promise<Payment[]> {
  const q = query(paymentsCollection(uid, clientId), orderBy("date", "desc"), limit(100));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => paymentFromSnapshot(item.id, item.data()));
}

function paymentTime(payment: Payment): number {
  const date = payment.date;
  return date && typeof date.toMillis === "function" ? date.toMillis() : 0;
}

export async function listAllPayments(uid: string, clients?: Client[]): Promise<Payment[]> {
  const clientList = clients ?? (await listClients(uid));
  const nestedPayments = await Promise.all(
    clientList.map((client) => listClientPayments(uid, client.id).catch(() => [])),
  );

  return nestedPayments
    .flat()
    .sort((a, b) => paymentTime(b) - paymentTime(a))
    .slice(0, 300);
}

export interface PaymentInput {
  amount: number;
  date: string;
  note: string;
}

export async function registerPayment(
  uid: string,
  client: Client,
  debt: Debt,
  input: PaymentInput,
): Promise<string> {
  const db = getFirebaseDb();
  const clientRef = clientDoc(uid, client.id);
  const debtRef = debtDoc(uid, client.id, debt.id);
  const paymentsRef = paymentsCollection(uid, client.id);

  return runTransaction(db, async (transaction) => {
    const [clientSnapshot, debtSnapshot] = await Promise.all([
      transaction.get(clientRef),
      transaction.get(debtRef),
    ]);
    if (!clientSnapshot.exists()) throw new Error("Cliente no encontrado");
    if (!debtSnapshot.exists()) throw new Error("Deuda no encontrada");

    const current = clientSnapshot.data() as Client;
    const currentDebt = debtSnapshot.data() as Debt & { clientId?: string };
    const clientStatus = current.status as Client["status"];
    const debtStatus = currentDebt.status as Debt["status"];
    const debtBalance = Number(currentDebt.outstandingBalance || 0);

    if (clientStatus === "settled" || clientStatus === "archived") {
      throw new Error("No se pueden registrar abonos en una cuenta saldada o archivada");
    }
    if (debtStatus === "settled") {
      throw new Error("Esta deuda ya está saldada");
    }
    if (input.amount <= 0) throw new Error("El monto debe ser mayor a cero");
    if (input.amount > debtBalance) throw new Error("El pago no puede superar el saldo de la deuda");

    const paymentRef = doc(paymentsRef);
    const paymentDate = input.date
      ? Timestamp.fromDate(new Date(`${input.date}T12:00:00`))
      : Timestamp.now();
    const nextDebtPrincipalPaid = Number(currentDebt.principalPaid || 0) + input.amount;
    const nextDebtBalance = debtBalance - input.amount;
    const nextClientTotalPaid = Number(current.totalPaid || 0) + input.amount;
    const nextClientBalance = Number(current.balance || 0) - input.amount;

    transaction.set(paymentRef, {
      clientId: client.id,
      clientName: current.name || client.name,
      debtId: debt.id,
      debtLabel: currentDebt.label || debt.label,
      amount: input.amount,
      date: paymentDate,
      note: input.note.trim(),
      status: "active",
      createdAt: serverTimestamp(),
      voidedAt: null,
      voidReason: "",
    });

    transaction.update(debtRef, {
      principalPaid: nextDebtPrincipalPaid,
      outstandingBalance: nextDebtBalance,
      status: nextDebtBalance === 0 ? "settled" : currentDebt.status,
      updatedAt: serverTimestamp(),
    });

    transaction.update(clientRef, {
      totalPaid: nextClientTotalPaid,
      balance: nextClientBalance,
      status: nextClientBalance === 0 ? "settled" : "active",
      updatedAt: serverTimestamp(),
    });

    return paymentRef.id;
  });
}

export async function voidPayment(
  uid: string,
  clientId: string,
  paymentId: string,
  reason: string,
): Promise<void> {
  const db = getFirebaseDb();
  const clientRef = clientDoc(uid, clientId);
  const paymentRef = paymentDoc(uid, clientId, paymentId);

  const client = await getClient(uid, clientId);
  const debts = client ? await listClientDebts(uid, client) : [];

  await runTransaction(db, async (transaction) => {
    const [clientSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(clientRef),
      transaction.get(paymentRef),
    ]);

    if (!clientSnapshot.exists()) throw new Error("Cliente no encontrado");
    if (!paymentSnapshot.exists()) throw new Error("Pago no encontrado");

    const clientData = clientSnapshot.data() as Client;
    const paymentData = paymentSnapshot.data() as Payment;

    if (paymentData.status === "voided") throw new Error("Este pago ya fue anulado");

    const debtId = paymentData.debtId || debts[0]?.id;
    const debtRef = debtId ? debtDoc(uid, clientId, debtId) : null;
    const debtSnapshot = debtRef ? await transaction.get(debtRef) : null;

    const amount = Number(paymentData.amount || 0);
    const nextTotalPaid = Math.max(0, Number(clientData.totalPaid || 0) - amount);
    const nextBalance = Number(clientData.balance || 0) + amount;
    const nextStatus =
      clientData.status === "archived"
        ? "archived"
        : nextBalance === 0
          ? "settled"
          : "active";

    transaction.update(paymentRef, {
      status: "voided",
      voidedAt: serverTimestamp(),
      voidReason: reason.trim(),
    });

    if (debtSnapshot?.exists()) {
      const debtData = debtSnapshot.data() as Debt;
      const nextDebtPrincipalPaid = Math.max(0, Number(debtData.principalPaid || 0) - amount);
      const nextDebtBalance = Number(debtData.outstandingBalance || 0) + amount;
      transaction.update(debtRef!, {
        principalPaid: nextDebtPrincipalPaid,
        outstandingBalance: nextDebtBalance,
        status: nextDebtBalance === 0 ? "settled" : debtData.status,
        updatedAt: serverTimestamp(),
      });
    }

    transaction.update(clientRef, {
      totalPaid: nextTotalPaid,
      balance: nextBalance,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  });
}
