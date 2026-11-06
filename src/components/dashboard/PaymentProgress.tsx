import { clampProgress } from "@/lib/utils/currency";

export function PaymentProgress({ totalPaid, initialDebt }: { totalPaid: number; initialDebt: number }) {
  const progress = clampProgress(totalPaid, initialDebt);
  const complete = progress >= 100;

  return (
    <div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${complete ? "bg-emerald-400" : "bg-gradient-to-r from-amber-400 to-emerald-400"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-semibold text-zinc-500">{progress}% completado</p>
    </div>
  );
}
