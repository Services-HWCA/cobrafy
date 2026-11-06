"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginPage from "./(auth)/login/page";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/inicio");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-400" />
      </main>
    );
  }

  if (user) {
    return null;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative w-full max-w-md">
        <LoginPage />
      </div>
    </main>
  );
}
