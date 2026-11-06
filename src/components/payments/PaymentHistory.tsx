"use client";

import { formatCurrencyDefault } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/date";
import type { Payment } from "@/types";

interface PaymentHistoryProps {
  payments: Payment[];
  onVoid?: (payment: Payment) => void;
}

export function PaymentHistory({ payments, onVoid }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
        No hay pagos para mostrar.
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
            className={`rounded-3xl border p-4 ${
              voided
                ? "border-red-500/30 bg-red-500/10"
                : "border-white/10 bg-zinc-950/70"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{payment.clientName || "Cliente"}</p>
                <p className="mt-1 text-sm text-zinc-500">{formatDateTime(payment.date)}</p>
                {payment.note && <p className="mt-2 text-sm leading-6 text-zinc-400">{payment.note}</p>}
                {voided && payment.voidReason && (
                  <p className="mt-2 text-xs text-red-300">Motivo: {payment.voidReason}</p>
                )}
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${voided ? "text-zinc-500 line-through" : "text-emerald-300"}`}>
                  {formatCurrencyDefault(payment.amount)}
                </p>
                {voided ? (
                  <p className="text-[11px] font-bold uppercase tracking-wide text-red-400">Anulado</p>
                ) : onVoid ? (
                  <button
                    type="button"
                    onClick={() => onVoid(payment)}
                    className="mt-1 text-xs font-semibold text-red-300 underline-offset-4 hover:underline"
                  >
                    Anular
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
