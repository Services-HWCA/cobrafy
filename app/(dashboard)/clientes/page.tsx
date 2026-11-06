"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ClientForm, type ClientFormValues } from "@/components/clients/ClientForm";
import { Modal } from "@/components/ui/Modal";
import {
  createClient,
  listClients,
  setClientArchived,
  updateClient,
} from "@/lib/services/client.service";
import { formatCurrencyDefault } from "@/lib/utils/currency";
import type { Client } from "@/types";

type Filter = "all" | "pending" | "settled" | "archived";

export default function ClientesPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const loadClients = useCallback(async () => {
    if (!user) return;
    try {
      setClients(await listClients(user.uid));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los clientes.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadClients();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadClients]);

  const visibleClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients
      .filter((client) => {
        if (filter === "pending" && (client.balance === 0 || client.status === "archived")) return false;
        if (filter === "settled" && client.status !== "settled") return false;
        if (filter === "archived" && client.status !== "archived") return false;
        if (!term) return true;
        return client.name.toLowerCase().includes(term) || client.phone.toLowerCase().includes(term);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, filter, search]);

  function openCreate() {
    setEditingClient(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(values: ClientFormValues) {
    if (!user) return;
    setFormLoading(true);
    setFormError("");
    try {
      if (editingClient) {
        await updateClient(user.uid, editingClient.id, values);
      } else {
        await createClient(user.uid, values);
      }
      setModalOpen(false);
      await loadClients();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar el cliente.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleArchive(client: Client) {
    if (!user) return;
    const archived = client.status !== "archived";
    if (archived && !window.confirm(`¿Archivar a ${client.name}?`)) return;
    try {
      await setClientArchived(user.uid, client.id, archived);
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el cliente.");
    }
  }

  const filters: Array<{ value: Filter; label: string }> = [
    { value: "all", label: "Todos" },
    { value: "pending", label: "Pendientes" },
    { value: "settled", label: "Saldados" },
    { value: "archived", label: "Archivados" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">Cartera</p>
          <h2 className="mt-2 text-3xl font-bold">Clientes</h2>
          <p className="mt-1 text-sm text-zinc-400">{clients.length} cuentas registradas</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-2xl bg-emerald-400 px-5 py-3.5 text-sm font-bold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 active:scale-95"
        >
          + Nuevo cliente
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o teléfono"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-4 focus:ring-emerald-400/10 lg:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                filter === item.value
                  ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                  : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando clientes...</p>
      ) : visibleClients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No hay clientes para mostrar.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleClients.map((client) => (
            <div key={client.id} className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 shadow-lg shadow-black/30 backdrop-blur transition hover:border-emerald-400/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/clientes/${client.id}`} className="font-semibold hover:underline">
                    {client.name}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-500">{client.phone || "Sin teléfono"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  client.status === "archived"
                    ? "bg-zinc-800 text-zinc-300"
                    : client.balance === 0
                      ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30"
                      : "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30"
                }`}>
                  {client.status === "archived" ? "Archivado" : client.balance === 0 ? "Saldado" : "Pendiente"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-zinc-500">Inicial</p>
                  <p className="font-medium">{formatCurrencyDefault(client.initialDebt)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Pagado</p>
                  <p className="font-medium">{formatCurrencyDefault(client.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Saldo</p>
                  <p className="font-medium">{formatCurrencyDefault(client.balance)}</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Link
                  href={`/clientes/${client.id}`}
                  className="flex-1 rounded-xl bg-emerald-400 px-3 py-2.5 text-center text-sm font-bold text-black transition hover:bg-emerald-300"
                >
                  Ver
                </Link>
                <button
                  type="button"
                  onClick={() => openEdit(client)}
                  className="flex-1 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-white/20 hover:text-white"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleArchive(client)}
                  className="rounded-xl border border-white/10 px-3 py-2.5 text-sm font-semibold text-zinc-400 transition hover:border-red-400/40 hover:text-red-300"
                >
                  {client.status === "archived" ? "Restaurar" : "Archivar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editingClient ? "Editar cliente" : "Nuevo cliente"}
        onClose={() => setModalOpen(false)}
      >
        <ClientForm
          client={editingClient}
          loading={formLoading}
          error={formError}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      </Modal>
    </div>
  );
}
