"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PaymentProgress } from "@/components/dashboard/PaymentProgress";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { PaymentForm, type PaymentFormValues } from "@/components/payments/PaymentForm";
import { PaymentHistory } from "@/components/payments/PaymentHistory";
import { VoidPaymentForm } from "@/components/payments/VoidPaymentForm";
import { Modal } from "@/components/ui/Modal";
import { getClient } from "@/lib/services/client.service";
import { listClientPayments, registerPayment, voidPayment } from "@/lib/services/payment.service";
import { formatCurrencyDefault } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { Client, Payment } from "@/types";

export function ClientDetails({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [clientData, paymentData] = await Promise.all([
        getClient(user.uid, clientId),
        listClientPayments(user.uid, clientId),
      ]);
      setClient(clientData);
      setPayments(paymentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el cliente.");
    } finally {
      setLoading(false);
    }
  }, [clientId, user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  async function handlePayment(values: PaymentFormValues) {
    if (!user || !client) return;
    setFormLoading(true);
    setFormError("");
    try {
      await registerPayment(user.uid, client, values);
      setPaymentModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo registrar el pago.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleVoid(reason: string) {
    if (!user || !client || !voidTarget) return;
    setFormLoading(true);
    setFormError("");
    try {
      await voidPayment(user.uid, client.id, voidTarget.id, reason);
      setVoidTarget(null);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo anular el pago.");
    } finally {
      setFormLoading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Cargando cliente...</p>;
  }

  if (!client) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center">
        <p className="text-sm text-zinc-500">Cliente no encontrado.</p>
        <Link href="/clientes" className="mt-3 inline-block text-sm font-medium underline">Volver a clientes</Link>
      </div>
    );
  }

  const progress = client.initialDebt > 0 ? Math.min(100, Math.round((client.totalPaid / client.initialDebt) * 100)) : 0;
  const canRegisterPayment = client.balance > 0 && client.status !== "archived";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clientes" className="text-xs font-medium text-zinc-500 hover:text-emerald-300">← Clientes</Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">{client.name}</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {client.phone || "Sin teléfono"} · Registrado el {formatDate(client.createdAt)}
            </p>
            {client.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{client.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => {
              setFormError("");
              setPaymentModalOpen(true);
            }}
            disabled={!canRegisterPayment}
            className="w-full rounded-2xl bg-emerald-400 px-5 py-3.5 text-sm font-bold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Registrar abono
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard label="Deuda original" value={formatCurrencyDefault(client.initialDebt)} />
        <SummaryCard label="Total abonado" value={formatCurrencyDefault(client.totalPaid)} tone="success" />
        <SummaryCard label="Saldo pendiente" value={formatCurrencyDefault(client.balance)} tone="warning" />
        <SummaryCard label="Progreso" value={`${progress}%`} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-lg shadow-black/30 backdrop-blur md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Estado de cobro</h3>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
            client.balance === 0
              ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30"
              : client.status === "archived"
                ? "bg-zinc-800 text-zinc-300"
                : "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30"
          }`}>
            {client.balance === 0 ? "Saldado" : client.status === "archived" ? "Archivado" : "Pendiente"}
          </span>
        </div>
        <PaymentProgress totalPaid={client.totalPaid} initialDebt={client.initialDebt} />
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Historial de pagos</h3>
        <PaymentHistory payments={payments} onVoid={setVoidTarget} />
      </section>

      <Modal open={paymentModalOpen} title="Registrar abono" onClose={() => setPaymentModalOpen(false)}>
        <PaymentForm
          client={client}
          loading={formLoading}
          error={formError}
          onCancel={() => setPaymentModalOpen(false)}
          onSubmit={handlePayment}
        />
      </Modal>

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
