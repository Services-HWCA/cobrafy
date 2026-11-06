import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase/client";
import type { UserProfile } from "@/types";

function assertConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error("Faltan las variables NEXT_PUBLIC_FIREBASE_* en .env.local");
  }
}

const SESSION_STARTED_KEY = "cobrafy:sessionStartedAt";
const SESSION_MAX_AGE_MS = 4 * 24 * 60 * 60 * 1000;

export function markSessionStarted() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
}

export function clearSessionMarker() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STARTED_KEY);
}

export async function ensureAuthPersistence() {
  assertConfigured();
  await setPersistence(getFirebaseAuth(), browserLocalPersistence);
}

export async function enforceSessionExpiry(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const startedAt = Number(window.localStorage.getItem(SESSION_STARTED_KEY) || 0);
  if (!startedAt) {
    markSessionStarted();
    return false;
  }
  if (Date.now() - startedAt <= SESSION_MAX_AGE_MS) return false;
  clearSessionMarker();
  await firebaseSignOut(getFirebaseAuth());
  return true;
}

export async function signIn(email: string, password: string) {
  assertConfigured();
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  markSessionStarted();
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function createAccount(name: string, email: string, password: string) {
  assertConfigured();
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  markSessionStarted();
  await updateProfile(credential.user, { displayName: name });
  await ensureUserProfile(credential.user, name);
  return credential.user;
}

export async function getRegisteredAuthMethods(email: string): Promise<string[]> {
  assertConfigured();
  return fetchSignInMethodsForEmail(getFirebaseAuth(), email);
}

export async function sendAccessEmail(email: string) {
  assertConfigured();
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function signOut() {
  assertConfigured();
  clearSessionMarker();
  await firebaseSignOut(getFirebaseAuth());
}

export async function ensureUserProfile(user: User, fallbackName?: string): Promise<UserProfile> {
  const db = getFirebaseDb();
  const profileRef = doc(db, "users", user.uid, "profile", "general");
  const snapshot = await getDoc(profileRef);

  if (snapshot.exists()) {
    return { uid: user.uid, ...(snapshot.data() as Omit<UserProfile, "uid">) };
  }

  const profile: Omit<UserProfile, "uid"> = {
    name: fallbackName || user.displayName || user.email?.split("@")[0] || "Cobrador",
    email: user.email || "",
    currency: "MXN",
    dateFormat: "dd/MM/yyyy",
    createdAt: null,
    updatedAt: null,
  };

  await setDoc(profileRef, {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { uid: user.uid, ...profile };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "users", uid, "profile", "general"));
  if (!snapshot.exists()) return null;
  return { uid, ...(snapshot.data() as Omit<UserProfile, "uid">) };
}

export async function updateUserProfile(
  uid: string,
  updates: { name?: string; currency?: string; dateFormat?: string },
): Promise<void> {
  const cleanUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
  if (updates.currency !== undefined) cleanUpdates.currency = updates.currency;
  if (updates.dateFormat !== undefined) cleanUpdates.dateFormat = updates.dateFormat;

  await updateDoc(doc(getFirebaseDb(), "users", uid, "profile", "general"), cleanUpdates);
}

export async function changePassword(user: User, currentPassword: string, newPassword: string) {
  if (!user.email) throw new Error("La cuenta no tiene correo asociado");

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
