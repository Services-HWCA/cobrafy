import { formatCurrencyDefault } from "@/lib/utils/currency";
import { formatDate, formatTime } from "@/lib/utils/date";
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
    <div className="space-y-2">
      {payments.map((payment) => {
        const voided = payment.status === "voided";
        return (
          <div
            key={payment.id}
            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
              voided
                ? "border-red-500/30 bg-red-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold">
                  {payment.clientName || "Cliente"}
                </span>
                {payment.debtLabel && (
                  <span className="shrink-0 text-[10px] font-medium text-zinc-500">
                    · {payment.debtLabel}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                <span>{formatDate(payment.date)}</span>
                <span>{formatTime(payment.date)}</span>
                {payment.note && (
                  <span className="truncate max-w-[120px] text-zinc-400">
                    {payment.note}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-sm font-bold ${voided ? "text-zinc-500 line-through" : "text-emerald-300"}`}>
                {formatCurrencyDefault(payment.amount)}
              </p>
              {voided && <p className="text-[10px] font-semibold uppercase text-red-400">Anulado</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
