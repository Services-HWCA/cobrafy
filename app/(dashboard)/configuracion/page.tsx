"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { changePassword, signOut, updateUserProfile } from "@/lib/services/auth.service";

export default function ConfiguracionPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await updateUserProfile(user.uid, {
        name: String(formData.get("name") || ""),
        currency: String(formData.get("currency") || "MXN"),
        dateFormat: String(formData.get("dateFormat") || "dd/MM/yyyy"),
      });
      setMessage("Preferencias guardadas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar las preferencias.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(user, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Contraseña actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">Cuenta</p>
        <h2 className="mt-2 text-3xl font-bold">Configuración</h2>
        <p className="mt-1 text-sm text-zinc-400">Perfil, preferencias y seguridad</p>
      </div>

      {(message || error) && (
        <div className="space-y-2">
          {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        </div>
      )}

      <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 shadow-lg shadow-black/30 backdrop-blur">
        <h3 className="font-semibold">Perfil</h3>
        <form onSubmit={handleProfileSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre del cobrador</label>
            <input name="name" defaultValue={profile?.name || ""} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Correo</label>
            <input value={user?.email || ""} disabled className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Moneda</label>
            <select name="currency" defaultValue={profile?.currency || "MXN"} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10">
              <option value="MXN">MXN - Peso mexicano</option>
              <option value="USD">USD - Dólar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="COP">COP - Peso colombiano</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Formato de fecha</label>
            <select name="dateFormat" defaultValue={profile?.dateFormat || "dd/MM/yyyy"} className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10">
              <option value="dd/MM/yyyy">dd/MM/yyyy</option>
              <option value="MM/dd/yyyy">MM/dd/yyyy</option>
              <option value="yyyy-MM-dd">yyyy-MM-dd</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className="rounded-2xl bg-emerald-400 px-5 py-3.5 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:opacity-60">
              Guardar preferencias
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 shadow-lg shadow-black/30 backdrop-blur">
        <h3 className="font-semibold">Cambiar contraseña</h3>
        <form onSubmit={handlePasswordSubmit} className="mt-4 grid gap-4 sm:grid-cols-3">
          <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Contraseña actual" className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10" required />
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Nueva contraseña" className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10" required />
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirmar contraseña" className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10" required />
          <div className="sm:col-span-3">
            <button type="submit" disabled={loading} className="rounded-2xl bg-emerald-400 px-5 py-3.5 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:opacity-60">
              Actualizar contraseña
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 shadow-lg shadow-black/30 backdrop-blur">
        <h3 className="font-semibold">Sesión</h3>
        <p className="mt-1 text-sm text-zinc-500">Estado de la cuenta: activa en Firebase Authentication</p>
        <button type="button" onClick={handleLogout} className="mt-4 rounded-xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-600 dark:border-red-900 dark:text-red-400">
          Cerrar sesión
        </button>
      </section>
    </div>
  );
}
