"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { NavIcon } from "@/components/layout/NavIcon";

const navItems = [
  { href: "/inicio", label: "Inicio", icon: "inicio" as const },
  { href: "/clientes", label: "Clientes", icon: "clientes" as const },
  { href: "/pagos", label: "Pagos", icon: "pagos" as const },
  { href: "/configuracion", label: "Ajustes", icon: "ajustes" as const },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400 text-black shadow-lg shadow-emerald-500/20">
        <span className="text-lg font-black">C</span>
      </div>
      {!compact && (
        <div>
          <p className="text-lg font-semibold leading-none">Cobrofy</p>
          <p className="mt-1 text-xs text-zinc-500">Gestión de cobros</p>
        </div>
      )}
    </div>
  );
}

function ShellContent({ children }: { children: ReactNode }) {
  const { user, profile, loading, configured } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && configured && !user) {
      router.replace("/");
    }
  }, [configured, loading, router, user]);

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <div className="max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <BrandMark />
          <h1 className="mt-6 text-xl font-semibold">Configuración pendiente</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Agrega las variables <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-emerald-300">NEXT_PUBLIC_FIREBASE_*</code> en{" "}
            <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-emerald-300">.env.local</code> y reinicia el servidor.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-400" />
      </div>
    );
  }

  const activeItem = navItems.find((item) => isActive(pathname, item.href));
  const displayName = profile?.name || user.displayName || user.email?.split("@")[0] || "Cobrador";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-black text-white">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/10 bg-zinc-950/80 backdrop-blur-xl md:flex">
        <div className="border-b border-white/10 px-6 py-6 flex items-center">
          <img src="/logoC.png" alt="Cobrofy" className="h-14 w-14" />
          <p className="mt-2 text-3xl font-medium uppercase tracking-[0.25em] text-emerald-400">obrofy</p>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold transition ${
                  active
                    ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/30"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className={active ? "text-emerald-300" : "text-zinc-500 group-hover:text-zinc-300"}>
                  <NavIcon name={item.icon} className="h-6 w-6" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 font-bold text-black">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between gap-4 px-4 md:h-24 md:px-8">
            <div className="flex items-center gap-4">
              <div className="md:hidden">
                <img src="/logoC.png" alt="Cobrofy" className="h-10 w-10" />
              </div>
              <div>
                <p className="text-xl font-medium uppercase tracking-[0.2em] text-emerald-400">obrofy</p>
              </div>
            </div>
            <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-sm font-bold text-black">
                {initials}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="mt-1 text-xs text-zinc-500">{user.email}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 pb-36 pt-6 md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1.5 py-3"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
                    active ? "bg-emerald-400 text-black shadow-lg shadow-emerald-500/25" : "text-zinc-500"
                  }`}
                >
                  <NavIcon name={item.icon} className="h-6 w-6" />
                </span>
                <span className={`text-[11px] font-semibold ${active ? "text-emerald-300" : "text-zinc-500"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}
