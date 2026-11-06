"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "@/lib/services/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email.trim(), password);
      router.replace("/inicio");
      router.refresh();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
        setError("Correo o contraseña incorrectos.");
      } else if (code.includes("too-many-requests")) {
        setError("Demasiados intentos. Espera un momento e inténtalo de nuevo.");
      } else {
        setError(code || "No se pudo iniciar sesión.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="relative">
        <div className="mb-8 flex items-center gap-4">
          <img src="/logoC.png" alt="Cobrofy" className="h-14 w-14" />

          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">Cobrofy</p>
            <h1 className="mt-1 text-3xl font-semibold">Iniciar sesión</h1>
          </div>
        </div>
        <p className="mb-8 text-sm leading-6 text-zinc-400">
          Accede con la cuenta autorizada en Firebase Authentication.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-300">
              Correo
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
              placeholder="cobrador@correo.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-300">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-400 px-4 py-4 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          ¿Tu cuenta aún no tiene acceso?{" "}
          <Link href="/register" className="font-semibold text-emerald-300 underline underline-offset-4">
            Actívala aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
