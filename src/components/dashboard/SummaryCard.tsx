interface SummaryCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "success" | "warning" | "info" | "danger";
}

const toneStyles = {
  default: "border-white/10 bg-zinc-950/70",
  success: "border-emerald-400/30 bg-emerald-400/10",
  warning: "border-amber-400/30 bg-amber-400/10",
  info: "border-sky-400/30 bg-sky-400/10",
  danger: "border-red-400/30 bg-red-400/10",
} as const;

const valueStyles = {
  default: "text-white",
  success: "text-emerald-300",
  warning: "text-amber-300",
  info: "text-sky-300",
  danger: "text-red-300",
} as const;

export function SummaryCard({ label, value, detail, tone = "default" }: SummaryCardProps) {
  return (
    <div className={`rounded-2xl border p-4 shadow-lg shadow-black/30 backdrop-blur md:rounded-3xl md:p-5 ${toneStyles[tone]}`}>
      <p className="line-clamp-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 md:text-xs">{label}</p>
      <p className={`mt-2 truncate text-lg font-bold md:mt-3 md:text-3xl ${valueStyles[tone]}`}>{value}</p>
      {detail && <p className="mt-2 text-xs text-zinc-500">{detail}</p>}
    </div>
  );
}
