"use client";

/** Barre du marché : 25 % des ventes les moins chères au m² … 25 % les plus chères, et le bien estimé */
export default function MarketBar({ p25, p75, median, value }: { p25: number; p75: number; median: number; value: number }) {
    const lo = Math.min(p25, value) * 0.9, hi = Math.max(p75, value) * 1.1;
    const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
    return (
        <div className="mt-6 mb-2">
            <div className="relative h-3 rounded-full" style={{ background: "linear-gradient(90deg, var(--p-sunken), var(--p-line-strong), var(--p-sunken))" }}>
                <div className="absolute top-0 h-3 rounded-full" style={{ left: pos(p25), width: `calc(${pos(p75)} - ${pos(p25)})`, background: "linear-gradient(90deg, rgba(211,95,82,0.35), rgba(211,95,82,0.6))" }}/>
                <div className="absolute -top-1 w-0.5 h-5 bg-[var(--p-muted)]" style={{ left: pos(median) }}/>
                <div className="absolute -top-2.5 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-[var(--p-card)] shadow-lg" style={{ left: pos(value), background: "linear-gradient(135deg, #8a0e01, #d35f52)" }}/>
            </div>
            <div className="relative h-10 mt-3 text-[10.5px] text-[var(--p-muted)] tabular-nums">
                <span className="absolute -translate-x-1/2 text-center" style={{ left: pos(p25) }}>{p25.toLocaleString("fr-FR")}<br/>25 %</span>
                <span className="absolute -translate-x-1/2 text-center" style={{ left: pos(median) }}>{median.toLocaleString("fr-FR")}<br/>médiane</span>
                <span className="absolute -translate-x-1/2 text-center" style={{ left: pos(p75) }}>{p75.toLocaleString("fr-FR")}<br/>75 %</span>
            </div>
        </div>
    );
}
