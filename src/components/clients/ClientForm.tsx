"use client";

import { useState, type FormEvent } from "react";
import { parseAmountToCents } from "@/lib/utils/currency";
import type { Client, InterestFrequency, InterestCalculation } from "@/types";

export interface ClientFormValues {
  name: string;
  phone: string;
  description: string;
  initialDebt: number;
  dueDate: string;
  interestEnabled: boolean;
  interestRate: number;
  interestFrequency: InterestFrequency;
  interestCalculation: InterestCalculation;
  graceDays: number;
}

interface ClientFormProps {
  client?: Client | null;
  loading?: boolean;
  error?: string;
  onSubmit: (values: ClientFormValues) => void;
  onCancel: () => void;
}

function todayInputValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function ClientForm({ client, loading = false, error = "", onSubmit, onCancel }: ClientFormProps) {
  const [name, setName] = useState(client?.name || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [description, setDescription] = useState(client?.description || "");
  const [debt, setDebt] = useState(client ? (client.initialDebt / 100).toFixed(2) : "");
  const [dueDate, setDueDate] = useState("");
  const [interestEnabled, setInterestEnabled] = useState(false);
  const [interestRate, setInterestRate] = useState("");
  const [interestFrequency, setInterestFrequency] = useState<InterestFrequency>("monthly");
  const [interestCalculation, setInterestCalculation] = useState<InterestCalculation>("simple");
  const [graceDays, setGraceDays] = useState("0");
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
    if (interestEnabled && (!interestRate || Number(interestRate) <= 0)) {
      setValidationError("La tasa de interés debe ser mayor a cero.");
      return;
    }

    onSubmit({
      name,
      phone,
      description,
      initialDebt: initialDebt || 0,
      dueDate,
      interestEnabled,
      interestRate: interestEnabled ? Number(interestRate) : 0,
      interestFrequency,
      interestCalculation,
      graceDays: Number(graceDays) || 0,
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
        <>
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
          <div>
            <label htmlFor="client-due-date" className="mb-1 block text-sm font-medium">Día esperado de pago</label>
            <input
              id="client-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
            />
            <p className="mt-1 text-xs text-zinc-500">Opcional. Si se pasa la fecha, se pueden aplicar intereses.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <label htmlFor="interest-enabled" className="text-sm font-medium">Personalizar deuda</label>
              <input
                id="interest-enabled"
                type="checkbox"
                checked={interestEnabled}
                onChange={(event) => setInterestEnabled(event.target.checked)}
                className="h-5 w-5 rounded border-white/20 bg-black/60 text-emerald-400 focus:ring-emerald-400/30"
              />
            </div>
            {interestEnabled && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="interest-rate" className="mb-1 block text-sm font-medium">Interés post día esperado (%)</label>
                  <input
                    id="interest-rate"
                    inputMode="decimal"
                    value={interestRate}
                    onChange={(event) => setInterestRate(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
                    placeholder="5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="interest-frequency" className="mb-1 block text-sm font-medium">Frecuencia</label>
                    <select
                      id="interest-frequency"
                      value={interestFrequency}
                      onChange={(event) => setInterestFrequency(event.target.value as InterestFrequency)}
                      className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10 [color-scheme:dark]"
                    >
                      <option value="monthly">Mensual</option>
                      <option value="weekly">Semanal</option>
                      <option value="daily">Diario</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="interest-calculation" className="mb-1 block text-sm font-medium">Cálculo</label>
                    <select
                      id="interest-calculation"
                      value={interestCalculation}
                      onChange={(event) => setInterestCalculation(event.target.value as InterestCalculation)}
                      className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10 [color-scheme:dark]"
                    >
                      <option value="simple">Simple (sobre saldo)</option>
                      <option value="compound">Compuesto (sobre capital)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="grace-days" className="mb-1 block text-sm font-medium">Días de gracia</label>
                  <input
                    id="grace-days"
                    type="number"
                    min="0"
                    value={graceDays}
                    onChange={(event) => setGraceDays(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-zinc-500">Días extra antes de aplicar intereses.</p>
                </div>
              </div>
            )}
          </div>
        </>
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
