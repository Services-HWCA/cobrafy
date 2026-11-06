"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClientCard } from "@/components/dashboard/ClientCard";
import { RecentPayments } from "@/components/dashboard/RecentPayments";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { ClientForm, type ClientFormValues } from "@/components/clients/ClientForm";
import { Modal } from "@/components/ui/Modal";
import { createClient, listClients } from "@/lib/services/client.service";
import { listAllPayments } from "@/lib/services/payment.service";
import { calculateDebtMetrics } from "@/lib/services/metrics.service";
import { formatCurrencyDefault } from "@/lib/utils/currency";
import type { Client, Payment } from "@/types";

type Filter = "all" | "pending" | "settled";

export default function InicioPage() {
  const { user, profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [debtMetrics, setDebtMetrics] = useState({
    overdueDebts: 0,
    overdueBalance: 0,
    totalAccruedInterest: 0,
    upcomingDueDebts: 0,
    overdueClients: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentsError, setPaymentsError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const clientList = await listClients(user.uid);
      setClients(clientList);
      setError("");

      try {
        const paymentList = await listAllPayments(user.uid, clientList);
        setPayments(paymentList);
        setPaymentsError("");
      } catch {
        setPayments([]);
        setPaymentsError("No se pudieron cargar los últimos abonos.");
      }

      try {
        const metrics = await calculateDebtMetrics(user.uid);
        setDebtMetrics(metrics);
      } catch {
        // Silencioso: si falla, no mostramos métricas
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
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

  const visibleClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients
      .filter((client) => {
        if (client.status === "archived") return false;
        if (filter === "pending" && client.balance === 0) return false;
        if (filter === "settled" && client.balance !== 0) return false;
        if (!term) return true;
        return client.name.toLowerCase().includes(term) || client.phone.toLowerCase().includes(term);
      })
      .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
  }, [clients, filter, search]);

  const totals = useMemo(() => {
    const activeClients = clients.filter((client) => client.status !== "archived");
    return {
      pending: activeClients.reduce((sum, client) => sum + client.balance, 0),
      collected: activeClients.reduce((sum, client) => sum + client.totalPaid, 0),
      activeCount: activeClients.filter((client) => client.balance > 0).length,
      settledCount: activeClients.filter((client) => client.balance === 0).length,
    };
  }, [clients]);

  const recentPayments = payments.slice(0, 6);
  const greeting = profile?.name?.split(" ")[0] || user?.displayName?.split(" ")[0] || "Cobrador";

  async function handleCreateClient(values: ClientFormValues) {
    if (!user) return;
    setFormLoading(true);
    setFormError("");
    try {
      await createClient(user.uid, values);
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo crear el cliente.");
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-2xl font-bold text-transparent md:text-3xl">
          Hola, {greeting}
        </h2>
      </section>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      <section className="grid grid-cols-3 gap-3 xl:grid-cols-5">
        <SummaryCard label="Por cobrar" value={formatCurrencyDefault(totals.pending)} tone="warning" />
        <SummaryCard label="Recaudado" value={formatCurrencyDefault(totals.collected)} tone="success" />
        <SummaryCard label="Clientes activos" value={String(totals.activeCount)} />
        <SummaryCard label="Deudas saldadas" value={String(totals.settledCount)} />
        {debtMetrics.overdueDebts > 0 && (
          <SummaryCard label="Deudas vencidas" value={String(debtMetrics.overdueDebts)} tone="danger" />
        )}
        {debtMetrics.overdueBalance > 0 && (
          <SummaryCard label="Mora pendiente" value={formatCurrencyDefault(debtMetrics.overdueBalance)} tone="danger" />
        )}
        {debtMetrics.totalAccruedInterest > 0 && (
          <SummaryCard label="Intereses aplicados" value={formatCurrencyDefault(debtMetrics.totalAccruedInterest)} tone="warning" />
        )}
        {debtMetrics.upcomingDueDebts > 0 && (
          <SummaryCard label="Próximos vencimientos" value={String(debtMetrics.upcomingDueDebts)} tone="info" />
        )}
        {debtMetrics.overdueClients > 0 && (
          <SummaryCard label="Clientes en mora" value={String(debtMetrics.overdueClients)} tone="danger" />
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold">Clientes</h3>
            <Link href="/clientes" className="text-sm font-medium text-emerald-300 underline underline-offset-4">
              Ver todos
            </Link>
          </div>

          <div className="flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente"
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10"
            />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as Filter)}
              className="w-32 shrink-0 rounded-2xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm font-semibold text-white outline-none focus:border-emerald-400/70 [color-scheme:dark]"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="settled">Saldados</option>
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">Cargando clientes...</p>
          ) : visibleClients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
              No hay clientes para mostrar.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visibleClients.slice(0, 4).map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          )}
        </div>

        <div className="hidden rounded-3xl border border-white/10 bg-zinc-950/70 p-5 shadow-lg shadow-black/30 backdrop-blur xl:block">
          <h3 className="text-lg font-semibold">Últimos abonos</h3>
          {paymentsError && <p className="mt-2 text-xs text-amber-500">{paymentsError}</p>}
          <div className="mt-4">
            <RecentPayments payments={recentPayments} />
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          setFormError("");
          setModalOpen(true);
        }}
        className="fixed bottom-28 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-emerald-400 px-6 text-base font-bold text-black shadow-2xl shadow-emerald-500/30 transition hover:bg-emerald-300 active:scale-95 md:bottom-8 md:right-8"
      >
        <span className="text-2xl leading-none">+</span>
        Cliente
      </button>

      <Modal open={modalOpen} title="Agregar cliente" onClose={() => setModalOpen(false)}>
        <ClientForm
          loading={formLoading}
          error={formError}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleCreateClient}
        />
      </Modal>
    </div>
  );
}
