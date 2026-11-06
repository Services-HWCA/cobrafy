import Link from "next/link";
import { PaymentProgress } from "@/components/dashboard/PaymentProgress";
import { formatCurrencyDefault } from "@/lib/utils/currency";
import type { Client } from "@/types";

export function ClientCard({ client }: { client: Client }) {
  const settled = client.balance === 0;
  const archived = client.status === "archived";
  const statusLabel = archived ? "Archivado" : settled ? "Saldado" : "Pendiente";
  const statusClass = archived
    ? "bg-zinc-800 text-zinc-300"
    : settled
      ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30"
      : "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30";

  return (
    <Link
      href={`/clientes/${client.id}`}
      className="group block rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-sm backdrop-blur transition hover:border-emerald-400/40 hover:bg-zinc-900/80"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight">{client.name}</h3>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 hidden truncate text-xs text-zinc-500 sm:block">{client.phone || "Sin teléfono"}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Restante</p>
          <p className={`text-base font-bold md:text-lg ${settled ? "text-emerald-300" : "text-amber-300"}`}>
            {formatCurrencyDefault(client.balance)}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex justify-between text-[11px] text-zinc-500">
          <span>Pagado {formatCurrencyDefault(client.totalPaid)}</span>
          <span>de {formatCurrencyDefault(client.initialDebt)}</span>
        </div>
        <PaymentProgress totalPaid={client.totalPaid} initialDebt={client.initialDebt} />
      </div>
    </Link>
  );
}
