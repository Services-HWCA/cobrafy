import { formatCurrencyDefault } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/date";
import type { Payment } from "@/types";

export function RecentPayments({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
        Aún no hay pagos registrados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => {
        const voided = payment.status === "voided";
        return (
          <div
            key={payment.id}
            className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${
              voided
                ? "border-red-500/30 bg-red-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{payment.clientName || "Cliente"}</p>
              <p className="mt-1 text-xs text-zinc-500">{formatDateTime(payment.date)}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${voided ? "text-zinc-500 line-through" : "text-emerald-300"}`}>
                {formatCurrencyDefault(payment.amount)}
              </p>
              {voided && <p className="text-[11px] font-semibold uppercase text-red-400">Anulado</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
