"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PaymentHistory } from "@/components/payments/PaymentHistory";
import { VoidPaymentForm } from "@/components/payments/VoidPaymentForm";
import { Modal } from "@/components/ui/Modal";
import { listClients } from "@/lib/services/client.service";
import { listAllPayments, voidPayment } from "@/lib/services/payment.service";
import { formatCurrencyDefault } from "@/lib/utils/currency";
import { toDate } from "@/lib/utils/date";
import type { Client, Payment } from "@/types";

type Period = "all" | "today" | "7d" | "30d" | "custom";

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function PagosPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [clientId, setClientId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const clientList = await listClients(user.uid);
      setClients(clientList);
      const paymentList = await listAllPayments(user.uid, clientList);
      setPayments(paymentList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los pagos.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  const filteredPayments = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const from = fromDate ? startOfDay(new Date(`${fromDate}T00:00:00`)) : null;
    const to = toDateInput ? startOfDay(new Date(`${toDateInput}T00:00:00`)) : null;

    return payments.filter((payment) => {
      if (clientId !== "all" && payment.clientId !== clientId) return false;
      const date = toDate(payment.date);
      if (!date) return false;
      const day = startOfDay(date);

      if (period === "today" && day.getTime() !== today.getTime()) return false;
      if (period === "7d" && day < weekAgo) return false;
      if (period === "30d" && day < monthAgo) return false;
      if (period === "custom") {
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      return true;
    });
  }, [clientId, fromDate, payments, period, toDateInput]);

  const totalVisible = filteredPayments
    .filter((payment) => payment.status === "active")
    .reduce((sum, payment) => sum + payment.amount, 0);

  async function handleVoid(reason: string) {
    if (!user || !voidTarget) return;
    setFormLoading(true);
    setFormError("");
    try {
      await voidPayment(user.uid, voidTarget.clientId, voidTarget.id, reason);
      setVoidTarget(null);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo anular el pago.");
    } finally {
      setFormLoading(false);
    }
  }

  const periodOptions: Array<{ value: Period; label: string }> = [
    { value: "all", label: "Todos" },
    { value: "today", label: "Hoy" },
    { value: "7d", label: "7 días" },
    { value: "30d", label: "30 días" },
    { value: "custom", label: "Personalizado" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">Movimientos</p>
        <h2 className="mt-2 text-3xl font-bold">Pagos</h2>
        <p className="mt-1 text-sm text-zinc-400">Historial de movimientos recibidos</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-4 shadow-lg shadow-black/30 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as Period)}
            className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white outline-none focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
          >
            <option value="all">Todos los clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          {period === "custom" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]" />
              <input type="date" value={toDateInput} onChange={(event) => setToDateInput(event.target.value)} className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]" />
            </div>
          )}
          <div className="lg:ml-auto rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Total visible</p>
            <p className="mt-1 text-xl font-bold text-emerald-300">{formatCurrencyDefault(totalVisible)}</p>
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando pagos...</p>
      ) : (
        <PaymentHistory payments={filteredPayments} onVoid={(payment) => { setFormError(""); setVoidTarget(payment); }} />
      )}

      <Modal open={Boolean(voidTarget)} title="Anular pago" onClose={() => setVoidTarget(null)}>
        {voidTarget && (
          <VoidPaymentForm
            payment={voidTarget}
            loading={formLoading}
            error={formError}
            onCancel={() => setVoidTarget(null)}
            onSubmit={handleVoid}
          />
        )}
      </Modal>
    </div>
  );
}
