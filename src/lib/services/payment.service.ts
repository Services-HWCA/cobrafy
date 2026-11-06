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
import { listClients } from "@/lib/services/client.service";
import type { Client, Payment } from "@/types";

function paymentsCollection(uid: string, clientId: string) {
  return collection(getFirebaseDb(), "users", uid, "clients", clientId, "payments");
}

function paymentDoc(uid: string, clientId: string, paymentId: string) {
  return doc(getFirebaseDb(), "users", uid, "clients", clientId, "payments", paymentId);
}

function clientDoc(uid: string, clientId: string) {
  return doc(getFirebaseDb(), "users", uid, "clients", clientId);
}

function paymentFromSnapshot(id: string, data: DocumentData): Payment {
  return {
    id,
    clientId: data.clientId || "",
    clientName: data.clientName || "",
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
  input: PaymentInput,
): Promise<string> {
  const db = getFirebaseDb();
  const clientRef = clientDoc(uid, client.id);
  const paymentsRef = paymentsCollection(uid, client.id);

  return runTransaction(db, async (transaction) => {
    const clientSnapshot = await transaction.get(clientRef);
    if (!clientSnapshot.exists()) throw new Error("Cliente no encontrado");

    const current = clientSnapshot.data() as Client & { clientId?: string };
    const balance = Number(current.balance || 0);
    const status = current.status as Client["status"];

    if (status === "settled" || status === "archived") {
      throw new Error("No se pueden registrar abonos en una cuenta saldada o archivada");
    }
    if (input.amount <= 0) throw new Error("El monto debe ser mayor a cero");
    if (input.amount > balance) throw new Error("El pago no puede superar el saldo pendiente");

    const paymentRef = doc(paymentsRef);
    const paymentDate = input.date
      ? Timestamp.fromDate(new Date(`${input.date}T12:00:00`))
      : Timestamp.now();
    const nextTotalPaid = Number(current.totalPaid || 0) + input.amount;
    const nextBalance = balance - input.amount;

    transaction.set(paymentRef, {
      clientId: client.id,
      clientName: current.name || client.name,
      amount: input.amount,
      date: paymentDate,
      note: input.note.trim(),
      status: "active",
      createdAt: serverTimestamp(),
      voidedAt: null,
      voidReason: "",
    });

    transaction.update(clientRef, {
      totalPaid: nextTotalPaid,
      balance: nextBalance,
      status: nextBalance === 0 ? "settled" : "active",
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

    const nextTotalPaid = Math.max(0, Number(clientData.totalPaid || 0) - Number(paymentData.amount || 0));
    const nextBalance = Number(clientData.balance || 0) + Number(paymentData.amount || 0);
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

    transaction.update(clientRef, {
      totalPaid: nextTotalPaid,
      balance: nextBalance,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  });
}
