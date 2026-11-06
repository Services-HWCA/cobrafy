"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { ensureAuthPersistence, enforceSessionExpiry, ensureUserProfile, getUserProfile } from "@/lib/services/auth.service";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  configured: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    ensureAuthPersistence()
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
          if (nextUser) {
            const expired = await enforceSessionExpiry().catch(() => false);
            if (expired) {
              setUser(null);
              setProfile(null);
              setLoading(false);
              return;
            }
          }
          setUser(nextUser);
          if (!nextUser) {
            setProfile(null);
            setLoading(false);
            return;
          }

          try {
            const existing = await getUserProfile(nextUser.uid);
            const resolved = existing || (await ensureUserProfile(nextUser));
            setProfile(resolved);
          } catch {
            setProfile(null);
          } finally {
            setLoading(false);
          }
        });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, configured: isFirebaseConfigured }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
