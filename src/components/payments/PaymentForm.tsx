"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatCurrencyDefault, parseAmountToCents } from "@/lib/utils/currency";
import type { Client, Debt } from "@/types";

export interface PaymentFormValues {
  debtId: string;
  amount: number;
  date: string;
  note: string;
}

interface PaymentFormProps {
  client: Client;
  debts: Debt[];
  loading?: boolean;
  error?: string;
  onSubmit: (values: PaymentFormValues) => void;
  onCancel: () => void;
}

function todayInputValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function PaymentForm({ client, debts, loading = false, error = "", onSubmit, onCancel }: PaymentFormProps) {
  const payableDebts = debts.filter((debt) => debt.status !== "settled" && debt.outstandingBalance > 0);
  const [debtId, setDebtId] = useState(payableDebts[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState("");
  const submitLock = useRef(false);

  const selectedDebt = payableDebts.find((debt) => debt.id === debtId) || payableDebts[0] || null;

  useEffect(() => {
    if (!loading) submitLock.current = false;
  }, [loading]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || submitLock.current || !selectedDebt) return;
    setValidationError("");

    const amountCents = parseAmountToCents(amount);
    if (!amountCents) {
      setValidationError("Ingresa un monto válido mayor a cero.");
      return;
    }
    if (amountCents > selectedDebt.outstandingBalance) {
      setValidationError(`El monto no puede superar el saldo pendiente de ${formatCurrencyDefault(selectedDebt.outstandingBalance)}.`);
      return;
    }
    if (!date) {
      setValidationError("Selecciona la fecha del pago.");
      return;
    }

    submitLock.current = true;
    onSubmit({ debtId: selectedDebt.id, amount: amountCents, date, note });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {payableDebts.length > 1 && (
        <div>
          <label htmlFor="payment-debt" className="mb-1 block text-sm font-medium">Deuda</label>
          <select
            id="payment-debt"
            value={selectedDebt?.id || ""}
            onChange={(event) => setDebtId(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10 [color-scheme:dark]"
          >
            {payableDebts.map((debt) => (
              <option key={debt.id} value={debt.id}>
                {debt.label} · saldo {formatCurrencyDefault(debt.outstandingBalance)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">Saldo pendiente{selectedDebt ? ` (${selectedDebt.label})` : ""}</span>
          <span className="font-semibold">{formatCurrencyDefault(selectedDebt?.outstandingBalance ?? client.balance)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-zinc-500">Cobro inicial</span>
          <span>{formatCurrencyDefault(selectedDebt?.initialAmount ?? client.initialDebt)}</span>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="payment-amount" className="text-sm font-medium">Monto recibido</label>
          <button
            type="button"
            onClick={() => selectedDebt && setAmount((selectedDebt.outstandingBalance / 100).toFixed(2))}
            className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Completar saldo
          </button>
        </div>
        <input
          id="payment-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
          placeholder="250.00"
          required
        />
      </div>
      <div>
        <label htmlFor="payment-date" className="mb-1 block text-sm font-medium">Fecha del pago</label>
        <input
          id="payment-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
          required
        />
      </div>
      <div>
        <label htmlFor="payment-note" className="mb-1 block text-sm font-medium">Nota</label>
        <textarea
          id="payment-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
          placeholder="Opcional"
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
          disabled={loading || !selectedDebt}
          className="flex-1 rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:opacity-60"
        >
          {loading ? "Registrando..." : "Registrar abono"}
        </button>
      </div>
    </form>
  );
}
