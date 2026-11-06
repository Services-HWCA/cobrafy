import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { Client, ClientStatus } from "@/types";

function clientsCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "clients");
}

function clientDoc(uid: string, clientId: string) {
  return doc(getFirebaseDb(), "users", uid, "clients", clientId);
}

function clientFromSnapshot(id: string, data: DocumentData): Client {
  return {
    id,
    name: data.name || "",
    phone: data.phone || "",
    description: data.description || "",
    initialDebt: Number(data.initialDebt || 0),
    totalPaid: Number(data.totalPaid || 0),
    balance: Number(data.balance || 0),
    status: (data.status || "active") as ClientStatus,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

export async function listClients(uid: string): Promise<Client[]> {
  const snapshot = await getDocs(clientsCollection(uid));
  return snapshot.docs
    .map((item) => clientFromSnapshot(item.id, item.data()))
    .sort((a, b) => {
      const aTime = a.createdAt && "toMillis" in a.createdAt ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt && "toMillis" in b.createdAt ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
}

export async function getClient(uid: string, clientId: string): Promise<Client | null> {
  const snapshot = await getDoc(clientDoc(uid, clientId));
  if (!snapshot.exists()) return null;
  return clientFromSnapshot(snapshot.id, snapshot.data());
}

export interface ClientInput {
  name: string;
  phone: string;
  description: string;
  initialDebt: number;
}

export async function createClient(uid: string, input: ClientInput): Promise<string> {
  const ref = await addDoc(clientsCollection(uid), {
    name: input.name.trim(),
    phone: input.phone.trim(),
    description: input.description.trim(),
    initialDebt: input.initialDebt,
    totalPaid: 0,
    balance: input.initialDebt,
    status: input.initialDebt === 0 ? "settled" : "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateClient(
  uid: string,
  clientId: string,
  input: Partial<ClientInput>,
): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.phone !== undefined) updates.phone = input.phone.trim();
  if (input.description !== undefined) updates.description = input.description.trim();
  await updateDoc(clientDoc(uid, clientId), updates);
}

export async function setClientArchived(uid: string, clientId: string, archived: boolean): Promise<void> {
  const client = await getClient(uid, clientId);
  if (!client) throw new Error("Cliente no encontrado");

  let status: ClientStatus = client.status;
  if (archived) {
    status = "archived";
  } else if (client.balance === 0) {
    status = "settled";
  } else {
    status = "active";
  }

  await updateDoc(clientDoc(uid, clientId), { status, updatedAt: serverTimestamp() });
}
