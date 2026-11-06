"use client";

import { useState, type FormEvent } from "react";
import { parseAmountToCents } from "@/lib/utils/currency";
import type { Client } from "@/types";

export interface ClientFormValues {
  name: string;
  phone: string;
  description: string;
  initialDebt: number;
}

interface ClientFormProps {
  client?: Client | null;
  loading?: boolean;
  error?: string;
  onSubmit: (values: ClientFormValues) => void;
  onCancel: () => void;
}

export function ClientForm({ client, loading = false, error = "", onSubmit, onCancel }: ClientFormProps) {
  const [name, setName] = useState(client?.name || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [description, setDescription] = useState(client?.description || "");
  const [debt, setDebt] = useState(client ? (client.initialDebt / 100).toFixed(2) : "");
  const [validationError, setValidationError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");

    const initialDebt = client ? client.initialDebt : parseAmountToCents(debt);
    if (!client && (!initialDebt || initialDebt <= 0)) {
      setValidationError("La deuda inicial debe ser mayor a cero.");
      return;
    }
    if (!name.trim()) {
      setValidationError("El nombre es obligatorio.");
      return;
    }

    onSubmit({
      name,
      phone,
      description,
      initialDebt: initialDebt || 0,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="client-name" className="mb-1 block text-sm font-medium">Nombre completo</label>
        <input
          id="client-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
          placeholder="María González"
          required
        />
      </div>
      <div>
        <label htmlFor="client-phone" className="mb-1 block text-sm font-medium">Teléfono</label>
        <input
          id="client-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
          placeholder="+52 55 0000 0000"
        />
      </div>
      <div>
        <label htmlFor="client-description" className="mb-1 block text-sm font-medium">Descripción</label>
        <textarea
          id="client-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
          placeholder="Notas opcionales"
        />
      </div>
      {!client && (
        <div>
          <label htmlFor="client-debt" className="mb-1 block text-sm font-medium">Deuda inicial</label>
          <input
            id="client-debt"
            inputMode="decimal"
            value={debt}
            onChange={(event) => setDebt(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
            placeholder="500.00"
            required
          />
        </div>
      )}

      {(validationError || error) && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {validationError || error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-2xl border border-white/10 px-4 py-3.5 text-sm font-semibold text-zinc-300 transition hover:border-white/20 hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:opacity-60"
        >
          {loading ? "Guardando..." : client ? "Guardar cambios" : "Crear cliente"}
        </button>
      </div>
    </form>
  );
}
