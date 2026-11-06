"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PaymentProgress } from "@/components/dashboard/PaymentProgress";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { DebtForm, type DebtFormValues } from "@/components/clients/DebtForm";
import { PaymentForm, type PaymentFormValues } from "@/components/payments/PaymentForm";
import { PaymentHistory } from "@/components/payments/PaymentHistory";
import { VoidPaymentForm } from "@/components/payments/VoidPaymentForm";
import { Modal } from "@/components/ui/Modal";
import { getClient } from "@/lib/services/client.service";
import { createDebt, listClientDebts } from "@/lib/services/debt.service";
import { listClientPayments, registerPayment, voidPayment } from "@/lib/services/payment.service";
import { formatCurrencyDefault } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { Client, Debt, Payment } from "@/types";

function paymentMatchesDebt(payment: Payment, debt: Debt, isFirstDebt: boolean) {
  if (payment.debtId) return payment.debtId === debt.id;
  return isFirstDebt;
}

export function ClientDetails({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [debtFilter, setDebtFilter] = useState("all");
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    let clientData: Client | null = null;
    try {
      clientData = await getClient(user.uid, clientId);
      setClient(clientData);
      if (!clientData) {
        setDebts([]);
        setPayments([]);
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el cliente.");
      setLoading(false);
      return;
    }

    const errors: string[] = [];
    const [debtResult, paymentResult] = await Promise.allSettled([
      listClientDebts(user.uid, clientData),
      listClientPayments(user.uid, clientId),
    ]);
    if (debtResult.status === "fulfilled") {
      setDebts(debtResult.value);
    } else {
      errors.push(debtResult.reason instanceof Error ? debtResult.reason.message : "deudas");
    }
    if (paymentResult.status === "fulfilled") {
      setPayments(paymentResult.value);
    } else {
      errors.push(paymentResult.reason instanceof Error ? paymentResult.reason.message : "pagos");
    }
    setError(errors.length ? `No se pudo cargar: ${errors.join(", ")}.` : "");
    setLoading(false);
  }, [clientId, user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  const filteredPayments = useMemo(() => {
    if (debtFilter === "all") return payments;
    const index = debts.findIndex((debt) => debt.id === debtFilter);
    if (index < 0) return payments;
    return payments.filter((payment) => paymentMatchesDebt(payment, debts[index], index === 0));
  }, [debtFilter, debts, payments]);

  async function handlePayment(values: PaymentFormValues) {
    if (!user || !client) return;
    const debt = debts.find((item) => item.id === values.debtId);
    if (!debt) {
      setFormError("Selecciona una deuda válida.");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      await registerPayment(user.uid, client, debt, values);
      setPaymentModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo registrar el pago.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleCreateDebt(values: DebtFormValues) {
    if (!user || !client) return;
    setFormLoading(true);
    setFormError("");
    try {
      await createDebt(user.uid, client.id, values);
      setDebtModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo crear la deuda.");
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
  const canRegisterPayment = debts.some((debt) => debt.status !== "settled" && debt.outstandingBalance > 0) && client.status !== "archived";

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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setDebtModalOpen(true);
              }}
              className="rounded-2xl border border-white/10 px-5 py-3.5 text-sm font-bold text-zinc-200 transition hover:border-emerald-400/40 hover:text-emerald-300"
            >
              + Nuevo cobro
            </button>
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setPaymentModalOpen(true);
              }}
              disabled={!canRegisterPayment}
              className="rounded-2xl bg-emerald-400 px-5 py-3.5 text-sm font-bold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Registrar abono
            </button>
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard label="Deuda general" value={formatCurrencyDefault(client.initialDebt)} />
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

      {debts.length > 1 && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Deudas</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {debts.map((debt) => {
              const debtProgress = debt.initialAmount > 0
                ? Math.min(100, Math.round((debt.principalPaid / debt.initialAmount) * 100))
                : 0;
              const statusColor = debt.status === "settled"
                ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30"
                : debt.status === "overdue"
                  ? "bg-red-400/15 text-red-300 ring-1 ring-red-400/30"
                  : debt.status === "dueSoon"
                    ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30"
                    : "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30";
              const statusLabel = debt.status === "settled"
                ? "Saldada"
                : debt.status === "overdue"
                  ? "En mora"
                  : debt.status === "dueSoon"
                    ? "Por vencer"
                    : "Al día";
              return (
                <div
                  key={debt.id}
                  className="rounded-3xl border border-white/10 bg-zinc-950/70 p-4 shadow-lg shadow-black/30 backdrop-blur"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{debt.label}</p>
                      <p className="mt-1 text-xs text-zinc-500">{formatDate(debt.createdAt)}</p>
                      {debt.dueDate && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Vence: {debt.dueDate}
                          {debt.interest.enabled && debt.interest.rate > 0 && (
                            <span className="ml-1 text-amber-400">· {debt.interest.rate}% interés</span>
                          )}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-zinc-500">Inicial</p>
                      <p className="font-medium">{formatCurrencyDefault(debt.initialAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Pagado</p>
                      <p className="font-medium">{formatCurrencyDefault(debt.principalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Saldo</p>
                      <p className="font-medium">{formatCurrencyDefault(debt.outstandingBalance)}</p>
                    </div>
                  </div>
                  {debt.accruedInterest > 0 && (
                    <div className="mt-2 flex justify-between text-xs">
                      <span className="text-zinc-500">Intereses aplicados</span>
                      <span className="font-medium text-amber-300">{formatCurrencyDefault(debt.accruedInterest)}</span>
                    </div>
                  )}
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${debtProgress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold">Historial de pagos</h3>
          {debts.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDebtFilter("all")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  debtFilter === "all"
                    ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                    : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                }`}
              >
                Todas
              </button>
              {debts.map((debt) => (
                <button
                  key={debt.id}
                  type="button"
                  onClick={() => setDebtFilter(debt.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    debtFilter === debt.id
                      ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                      : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {debt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <PaymentHistory payments={filteredPayments} onVoid={setVoidTarget} />
      </section>

      <Modal open={paymentModalOpen} title="Registrar abono" onClose={() => setPaymentModalOpen(false)}>
        <PaymentForm
          client={client}
          debts={debts}
          loading={formLoading}
          error={formError}
          onCancel={() => setPaymentModalOpen(false)}
          onSubmit={handlePayment}
        />
      </Modal>

      <Modal open={debtModalOpen} title="Nuevo cobro" onClose={() => setDebtModalOpen(false)}>
        <DebtForm
          loading={formLoading}
          error={formError}
          onCancel={() => setDebtModalOpen(false)}
          onSubmit={handleCreateDebt}
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
