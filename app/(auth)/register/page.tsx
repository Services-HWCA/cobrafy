"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { getRegisteredAuthMethods, sendAccessEmail } from "@/lib/services/auth.service";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const methods = await getRegisteredAuthMethods(normalizedEmail);

      if (methods.length === 0) {
        setError("Este correo no está autorizado. Pide al administrador que lo agregue primero en Firebase Authentication.");
        return;
      }

      await sendAccessEmail(normalizedEmail);
      setMessage("Te enviamos un correo para definir o restablecer tu contraseña. Revisa también spam.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl">
      <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="relative">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-2xl font-black text-black shadow-lg shadow-emerald-500/30">
            C
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">Cobrofy</p>
            <h1 className="mt-1 text-3xl font-semibold">Activar acceso</h1>
          </div>
        </div>
        <p className="mb-8 text-sm leading-6 text-zinc-400">
          Solo pueden activar acceso los correos que ya existen en Firebase Authentication.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-300">
              Correo autorizado
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-sky-400/70 focus:ring-4 focus:ring-sky-400/10"
              placeholder="cobrador@correo.com"
            />
          </div>

          {error && (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-sky-400 px-4 py-4 text-sm font-bold text-black transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Verificando..." : "Enviar enlace de acceso"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          ¿Ya tienes contraseña?{" "}
          <Link href="/login" className="font-semibold text-sky-300 underline underline-offset-4">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
