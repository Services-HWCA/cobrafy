"use client";

import { useState, type FormEvent } from "react";
import type { Payment } from "@/types";

interface VoidPaymentFormProps {
  payment: Payment;
  loading?: boolean;
  error?: string;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}

export function VoidPaymentForm({ payment, loading = false, error = "", onSubmit, onCancel }: VoidPaymentFormProps) {
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) {
      setValidationError("Indica el motivo de la anulación.");
      return;
    }
    onSubmit(reason);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
        <p className="font-medium">{payment.clientName || "Pago"}</p>
        <p className="mt-1 text-zinc-500">El movimiento original se conservará como anulado.</p>
      </div>
      <div>
        <label htmlFor="void-reason" className="mb-1 block text-sm font-medium">Motivo</label>
        <textarea
          id="void-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-400/70 focus:ring-4 focus:ring-red-400/10"
          placeholder="Ej. Pago registrado por error"
          required
        />
      </div>
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
          className="flex-1 rounded-2xl bg-red-500 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-red-400 disabled:opacity-60"
        >
          {loading ? "Anulando..." : "Anular pago"}
        </button>
      </div>
    </form>
  );
}
