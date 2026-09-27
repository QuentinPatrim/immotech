"use client";

/* ============================================================
   FINANCEMENT & RENTABILITÉ (parcours acquéreur)
   Taux BCE du mois + grille par durée, mensualité, coût du
   crédit, TAEG face à l'usure, endettement, reste à vivre,
   rentabilité locative, patrimoine à 10 ans, verdict.
   Tout se règle en direct pendant le rendez-vous.
   ============================================================ */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Landmark, Home, KeyRound, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import {
    DEFAULT_INPUTS, DEBT_LIMIT, DURATIONS, FALLBACK_RATES, computeFinancing, verdict,
    type Duration, type FinancingInputs, type Rates,
} from "@/lib/financing";

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const kEur = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(2).replace(".", ",")} M€` : `${Math.round(n / 1000).toLocaleString("fr-FR")} k€`);
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d).replace(".", ",")} %`;
const rate = (v: number) => `${v.toFixed(2).replace(".", ",")} %`;
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const periodLabel = (p: string) => { const [y, m] = p.split("-"); return `${MONTHS[Number(m) - 1] || ""} ${y}`.trim(); };

export type FinancingState = Partial<FinancingInputs> & { priceTouched?: boolean };

export default function FinancingSection({ price, estimatedValue, dpe, value, onChange }: {
    price: number;
    estimatedValue?: number;
    dpe?: string;
    value?: FinancingState;
    onChange?: (v: FinancingState) => void;
}) {
    const [rates, setRates] = useState<Rates>(FALLBACK_RATES);
    const [s, setS] = useState<FinancingState>(() => ({ ...value }));

    useEffect(() => {
        let alive = true;
        fetch("/api/taux").then(r => (r.ok ? r.json() : null)).then((d: Rates | null) => { if (alive && d?.grid) setRates(d); }).catch(() => {});
        return () => { alive = false; };
    }, []);

    const inputs: FinancingInputs = {
        ...DEFAULT_INPUTS,
        ...s,
        price: s.priceTouched && s.price ? s.price : price,
        downPayment: s.downPayment ?? Math.round((price * 0.1) / 1000) * 1000,
    };
    // Calculs légers (quelques milliers d'opérations) : recalculés à chaque rendu
    const r = computeFinancing(inputs, rates);
    const v = verdict(inputs, r, { estimatedValue, dpe });

    const set = (patch: FinancingState) => {
        const next = { ...s, ...patch };
        setS(next);
        onChange?.(next);
    };

    const rental = inputs.project === "locatif";
    const levelStyle = {
        top: "linear-gradient(135deg, #064e3b, #059669)",
        good: "linear-gradient(135deg, #0f3d2e, #3f8f6b)",
        negotiate: "linear-gradient(135deg, #7c2d12, #d97706)",
        avoid: "linear-gradient(135deg, #7f1d1d, #b91c1c)",
    }[v.level];
    const debtPct = r.debtRatio !== null ? Math.min(1, r.debtRatio / 0.5) : 0;
    const costTotal = inputs.price + r.notary + inputs.works + r.creditCost;
    const parts = [
        { label: "Prix du bien", v: inputs.price, c: "var(--p-fg)" },
        { label: "Frais de notaire", v: r.notary, c: "#c08457" },
        ...(inputs.works ? [{ label: "Travaux", v: inputs.works, c: "#8b7355" }] : []),
        { label: "Intérêts", v: Math.max(0, r.totalInterest), c: "var(--p-accent)" },
        { label: "Assurance & garantie", v: r.totalInsurance + r.guarantee, c: "#e0877c" },
    ];

    return (
        <div className="space-y-4">
            {/* Taux du moment */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--p-line)] text-[var(--p-fg)]" style={{ backgroundColor: "var(--p-card)" }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${rates.live ? "bg-[var(--p-positive)] animate-pulse" : "bg-[var(--p-muted)]"}`}/>
                    Taux moyen BCE · {periodLabel(rates.period)} · <span className="mp-num">{rate(rates.nominal)}</span>
                </span>
                <span className="text-xs px-3 py-1.5 rounded-full text-[var(--p-muted)] mp-num" style={{ backgroundColor: "var(--p-sunken)" }}>TAEG moyen {rate(rates.aprc)}</span>
                <span className="text-xs px-3 py-1.5 rounded-full text-[var(--p-muted)] mp-num" style={{ backgroundColor: "var(--p-sunken)" }}>Usure {rates.usuryEstimated ? "estimée " : ""}{rate(rates.usury)}</span>
            </div>

            <div className="grid lg:grid-cols-[0.95fr_1.25fr] gap-4 items-start">
                {/* ── Paramètres ── */}
                <div className="rounded-[28px] border border-[var(--p-line)] p-5 sm:p-6 space-y-5" style={{ backgroundColor: "var(--p-card)" }}>
                    <Segmented
                        value={inputs.project}
                        onChange={p => set({ project: p })}
                        options={[{ id: "rp", label: "Résidence principale", short: "Résidence princ.", icon: Home }, { id: "locatif", label: "Investissement locatif", short: "Locatif", icon: KeyRound }]}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Money label="Prix d'achat" value={inputs.price} onChange={n => set({ price: n, priceTouched: true })}/>
                        <Money label="Apport" value={inputs.downPayment} onChange={n => set({ downPayment: n })}/>
                        <Money label="Travaux" value={inputs.works} onChange={n => set({ works: n })}/>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--p-muted)] font-semibold">Type</span>
                            <button type="button" onClick={() => set({ newBuild: !inputs.newBuild })}
                                className="h-11 rounded-xl border border-[var(--p-line)] px-3 text-sm text-left text-[var(--p-fg)]" style={{ backgroundColor: "var(--p-field)" }}>
                                {inputs.newBuild ? "Neuf · frais 2,5 %" : "Ancien · frais 8 %"}
                            </button>
                        </label>
                    </div>

                    <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--p-muted)] font-semibold mb-2">Durée et taux</p>
                        <div className="grid grid-cols-3 gap-2">
                            {DURATIONS.map(y => {
                                const on = inputs.years === y;
                                return (
                                    <button key={y} type="button" onClick={() => set({ years: y as Duration, rate: undefined })}
                                        className={`rounded-2xl py-2.5 border transition-all ${on ? "border-transparent bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)] shadow-lg" : "border-[var(--p-line)] text-[var(--p-fg)] hover:bg-[var(--p-hover)]"}`}>
                                        <span className="block text-sm font-semibold">{y} ans</span>
                                        <span className={`block text-[11px] mp-num ${on ? "opacity-75" : "text-[var(--p-muted)]"}`}>{rate(rates.grid[y])}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <Num label="Taux négocié" suffix="%" step={0.05} value={r.rate} onChange={n => set({ rate: n || undefined })}/>
                            <Num label="Assurance / an" suffix="%" step={0.05} value={inputs.insuranceRate} onChange={n => set({ insuranceRate: n })}/>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Money label="Revenus nets / mois" value={inputs.income} onChange={n => set({ income: n })} placeholder="Foyer"/>
                        <Money label="Crédits en cours / mois" value={inputs.otherLoans} onChange={n => set({ otherLoans: n })}/>
                    </div>

                    {rental && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-2 gap-3 overflow-hidden">
                            <Money label="Loyer hors charges / mois" value={inputs.rent} onChange={n => set({ rent: n })}/>
                            <Money label="Charges non récup. / mois" value={inputs.charges} onChange={n => set({ charges: n })}/>
                            <Money label="Taxe foncière / an" value={inputs.propertyTax} onChange={n => set({ propertyTax: n })}/>
                            <Num label="Revalorisation / an" suffix="%" step={0.5} value={inputs.appreciation} onChange={n => set({ appreciation: n })}/>
                        </motion.div>
                    )}
                </div>

                {/* ── Résultats ── */}
                <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-[28px] p-6 sm:p-8 text-[#fff]" style={{ background: "radial-gradient(120% 140% at 0% 0%, #2a2522 0%, #151211 55%, #0b0909 100%)", boxShadow: "0 40px 90px -45px rgba(0,0,0,0.7)" }}>
                        <div className="absolute -right-16 -top-24 w-72 h-72 rounded-full opacity-25 blur-3xl bg-[#d35f52]"/>
                        <div className="relative flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10.5px] uppercase tracking-[0.25em] text-[rgba(255,255,255,0.6)] font-semibold flex items-center gap-1.5"><Landmark size={12}/> Mensualité</p>
                                <p className="mp-display mp-num text-[44px] sm:text-6xl leading-none mt-3">{r.loan ? eur(r.monthly) : "—"}</p>
                                <p className="mp-num text-xs sm:text-sm text-[rgba(255,255,255,0.7)] mt-3">
                                    {r.loan ? <>dont {eur(r.monthlyInsurance)} d&apos;assurance · {inputs.years} ans à {rate(r.rate)}</> : "Apport suffisant : pas de crédit"}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.55)] font-semibold">Emprunt</p>
                                <p className="mp-num text-lg font-semibold mt-1">{kEur(r.loan)}</p>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.55)] font-semibold mt-3">TAEG</p>
                                <p className={`mp-num text-lg font-semibold mt-1 ${r.usuryOk ? "" : "text-[#fca5a5]"}`}>{r.taeg !== null ? rate(r.taeg) : "—"}</p>
                            </div>
                        </div>
                        {/* Coût total de l'opération */}
                        <div className="relative mt-7">
                            <div className="flex h-2.5 rounded-full overflow-hidden bg-[rgba(255,255,255,0.08)]">
                                {parts.map(p => <div key={p.label} style={{ width: `${(p.v / costTotal) * 100}%`, background: p.c === "var(--p-fg)" ? "#f4efe9" : p.c }}/>)}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                                {parts.map(p => (
                                    <span key={p.label} className="text-[11px] text-[rgba(255,255,255,0.72)] inline-flex items-center gap-1.5 mp-num">
                                        <span className="w-2 h-2 rounded-full" style={{ background: p.c === "var(--p-fg)" ? "#f4efe9" : p.c }}/>{p.label} {kEur(p.v)}
                                    </span>
                                ))}
                            </div>
                            <p className="text-[11px] text-[rgba(255,255,255,0.5)] mt-3 mp-num">Coût du crédit {eur(r.creditCost)} · Opération totale {kEur(costTotal)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Tile label="Endettement" value={r.debtRatio !== null ? pct(r.debtRatio) : "—"} tone={r.debtRatio === null ? undefined : r.debtRatio <= DEBT_LIMIT ? "pos" : "neg"}
                            sub={r.debtRatio === null ? "saisir les revenus" : `plafond bancaire 35 %${rental ? " (70 % du loyer compté)" : ""}`}>
                            {r.debtRatio !== null && (
                                <div className="relative h-1.5 rounded-full mt-3" style={{ backgroundColor: "var(--p-sunken)" }}>
                                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${debtPct * 100}%`, background: r.debtRatio <= DEBT_LIMIT ? "var(--p-positive)" : "var(--p-negative)" }}/>
                                    <div className="absolute -top-1 -bottom-1 w-px bg-[var(--p-fg)]" style={{ left: `${(DEBT_LIMIT / 0.5) * 100}%` }}/>
                                </div>
                            )}
                        </Tile>
                        <Tile label="Reste à vivre" value={r.residual !== null ? eur(r.residual) : "—"} sub={r.maxLoan !== null ? `capacité d'emprunt ${kEur(r.maxLoan)}` : "par mois, après crédits"}/>
                        {rental ? (
                            <>
                                <Tile label="Rendement" value={r.netYield !== null ? pct(r.netYield) : "—"} sub={r.grossYield !== null ? `net de charges · brut ${pct(r.grossYield)}` : "saisir le loyer"}/>
                                <Tile label="Cash-flow" value={r.cashflow !== null ? `${r.cashflow >= 0 ? "+" : "−"}${eur(Math.abs(r.cashflow))}` : "—"} tone={r.cashflow === null ? undefined : r.cashflow >= 0 ? "pos" : "neg"} sub="par mois, avant impôt"/>
                            </>
                        ) : (
                            <>
                                <Tile label="Remboursé à 10 ans" value={kEur(Math.max(0, r.loan - (r.projection[10]?.debt ?? 0)))} sub="épargne forcée"/>
                                <Tile label="Frais de notaire" value={eur(r.notary)} sub={inputs.newBuild ? "neuf" : "ancien"}/>
                            </>
                        )}
                    </div>

                    {!r.usuryOk && (
                        <p className="text-xs rounded-2xl px-4 py-3 flex gap-2 text-[var(--p-fg-2)]" style={{ backgroundColor: "var(--p-sunken)" }}>
                            <AlertTriangle size={15} className="shrink-0 text-[var(--p-warning)]"/> TAEG supérieur au taux d&apos;usure : la banque ne peut pas prêter à ces conditions. Augmenter l&apos;apport ou renégocier l&apos;assurance.
                        </p>
                    )}
                </div>
            </div>

            {/* ── Patrimoine & verdict ── */}
            <div className="grid lg:grid-cols-[1.25fr_0.95fr] gap-4">
                <div className="rounded-[28px] border border-[var(--p-line)] p-5 sm:p-6" style={{ backgroundColor: "var(--p-card)" }}>
                    <div className="flex items-baseline justify-between gap-3 mb-4">
                        <p className="text-sm font-semibold text-[var(--p-fg)]">Votre patrimoine sur 10 ans</p>
                        <p className="text-xs text-[var(--p-muted)] mp-num">{rental && r.irr10 !== null ? <>TRI <b className="text-[var(--p-fg)]">{r.irr10.toFixed(1).replace(".", ",")} %</b> · </> : null}net <b className="text-[var(--p-fg)]">{kEur(r.equity10)}</b></p>
                    </div>
                    <div className="h-52 -ml-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={r.projection} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="fin-eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8a0e01" stopOpacity={0.45}/><stop offset="100%" stopColor="#8a0e01" stopOpacity={0}/></linearGradient>
                                    <linearGradient id="fin-debt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#94a3b8" stopOpacity={0.3}/><stop offset="100%" stopColor="#94a3b8" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="var(--p-line)"/>
                                <XAxis dataKey="year" tickFormatter={y => (y === 0 ? "Achat" : `${y} a`)} tick={{ fontSize: 11, fill: "var(--p-muted)" }} axisLine={false} tickLine={false}/>
                                <YAxis tickFormatter={kEur} width={58} tick={{ fontSize: 11, fill: "var(--p-muted)" }} axisLine={false} tickLine={false}/>
                                <Tooltip
                                    formatter={(val, name) => [eur(Number(val)), name === "equity" ? "Patrimoine net" : name === "debt" ? "Capital restant dû" : "Valeur du bien"]}
                                    labelFormatter={y => (Number(y) === 0 ? "À l'achat" : `Année ${y}`)}
                                    contentStyle={{ borderRadius: 14, border: "1px solid var(--p-line)", background: "var(--p-card)", color: "var(--p-fg)", fontSize: 12 }}
                                />
                                <Area type="monotone" dataKey="debt" stroke="#94a3b8" strokeWidth={1.5} fill="url(#fin-debt)"/>
                                <Area type="monotone" dataKey="equity" stroke="#b3261a" strokeWidth={2.5} fill="url(#fin-eq)"/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex gap-4 mt-2 text-[11px] text-[var(--p-muted)]">
                        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#b3261a]"/>Patrimoine net</span>
                        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#94a3b8]"/>Capital restant dû</span>
                        <span className="mp-num">revalorisation {inputs.appreciation.toString().replace(".", ",")} %/an</span>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-[28px] p-6 text-[#fff]" style={{ background: levelStyle }}>
                    <div className="flex items-center gap-4">
                        <ScoreRing score={v.score}/>
                        <div>
                            <p className="text-[10.5px] uppercase tracking-[0.22em] opacity-75 font-semibold">Notre verdict</p>
                            <p className="mp-display text-[28px] leading-tight mt-1">{v.label}</p>
                        </div>
                    </div>
                    <ul className="mt-5 space-y-2">
                        {v.pros.slice(0, 4).map(p => <li key={p} className="flex gap-2 text-sm"><CheckCircle2 size={16} className="shrink-0 mt-0.5 opacity-90"/>{p}</li>)}
                        {v.cons.slice(0, 4).map(c => <li key={c} className="flex gap-2 text-sm opacity-90"><XCircle size={16} className="shrink-0 mt-0.5 opacity-80"/>{c}</li>)}
                        {v.pros.length + v.cons.length === 0 && <li className="text-sm opacity-80">Renseignez les revenus{rental ? " et le loyer" : ""} pour affiner le verdict.</li>}
                    </ul>
                </div>
            </div>

            <p className="text-[11px] text-[var(--p-faint)] flex gap-1.5">
                <Info size={12} className="shrink-0 mt-0.5"/>
                Simulation indicative hors fiscalité. Taux : moyenne des nouveaux crédits habitat en France (BCE), grille par durée indicative ; usure {rates.usuryEstimated ? "estimée selon la règle légale (TAEG moyen + 1/3)" : "Banque de France"}. Garantie et frais de dossier estimés ; les conditions définitives dépendent de la banque.
            </p>
        </div>
    );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; short?: string; icon: typeof Home }[] }) {
    return (
        <div className="grid grid-cols-2 p-1 rounded-2xl gap-1" style={{ backgroundColor: "var(--p-sunken)" }} role="radiogroup">
            {options.map(o => (
                <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
                    className={`h-11 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${value === o.id ? "bg-[var(--p-card)] text-[var(--p-fg)] shadow" : "text-[var(--p-muted)]"}`}>
                    <o.icon size={14} className="shrink-0"/><span className="sm:hidden">{o.short || o.label}</span><span className="hidden sm:inline">{o.label}</span>
                </button>
            ))}
        </div>
    );
}

function Money({ label, value, onChange, placeholder }: { label: string; value: number; onChange: (n: number) => void; placeholder?: string }) {
    return (
        <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--p-muted)] font-semibold truncate">{label}</span>
            <span className="relative">
                <input inputMode="numeric" value={value ? value.toLocaleString("fr-FR") : ""} placeholder={placeholder || "0"}
                    onChange={e => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
                    className="w-full h-11 rounded-xl border border-[var(--p-line)] px-3 pr-7 text-sm outline-none mp-num text-[var(--p-fg)] focus:border-[var(--p-line-strong)]" style={{ backgroundColor: "var(--p-field)" }}/>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--p-muted)]">€</span>
            </span>
        </label>
    );
}

function Num({ label, value, onChange, suffix, step }: { label: string; value: number; onChange: (n: number) => void; suffix: string; step: number }) {
    const [txt, setTxt] = useState(value.toFixed(2).replace(".", ","));
    const [focus, setFocus] = useState(false);
    const shown = focus ? txt : value.toFixed(2).replace(".", ",");
    return (
        <label className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--p-muted)] font-semibold truncate">{label}</span>
            <span className="relative flex items-center">
                <button type="button" onClick={() => onChange(+Math.max(0, value - step).toFixed(2))} className="absolute left-1 h-9 w-8 rounded-lg text-[var(--p-muted)] hover:bg-[var(--p-hover)]" aria-label={`Diminuer ${label}`}>−</button>
                <input inputMode="decimal" value={shown}
                    onFocus={() => { setTxt(value.toFixed(2).replace(".", ",")); setFocus(true); }}
                    onBlur={() => setFocus(false)}
                    onChange={e => { setTxt(e.target.value); const n = parseFloat(e.target.value.replace(",", ".")); if (isFinite(n)) onChange(n); }}
                    className="w-full h-11 rounded-xl border border-[var(--p-line)] px-9 text-sm text-center outline-none mp-num text-[var(--p-fg)] focus:border-[var(--p-line-strong)]" style={{ backgroundColor: "var(--p-field)" }}/>
                <button type="button" onClick={() => onChange(+(value + step).toFixed(2))} className="absolute right-1 h-9 w-8 rounded-lg text-[var(--p-muted)] hover:bg-[var(--p-hover)]" aria-label={`Augmenter ${label}`}>+</button>
            </span>
            <span className="sr-only">{suffix}</span>
        </label>
    );
}

function Tile({ label, value, sub, tone, children }: { label: string; value: string; sub?: string; tone?: "pos" | "neg"; children?: React.ReactNode }) {
    return (
        <div className="rounded-[22px] border border-[var(--p-line)] p-4 sm:p-5 min-w-0" style={{ backgroundColor: "var(--p-card)" }}>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--p-muted)] font-semibold truncate">{label}</p>
            <p className={`mp-display mp-num text-[22px] sm:text-[26px] leading-tight mt-1.5 ${tone === "pos" ? "text-[var(--p-positive)]" : tone === "neg" ? "text-[var(--p-negative)]" : "text-[var(--p-fg)]"}`}>{value}</p>
            {sub && <p className="text-[11px] text-[var(--p-muted)] mt-1 leading-snug">{sub}</p>}
            {children}
        </div>
    );
}

function ScoreRing({ score }: { score: number }) {
    const R = 26, C = 2 * Math.PI * R;
    return (
        <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5"/>
                <motion.circle cx="32" cy="32" r={R} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeDasharray={C}
                    initial={false} animate={{ strokeDashoffset: C * (1 - score / 100) }} transition={{ duration: 0.6 }}/>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center mp-num font-semibold text-lg">{score}</span>
        </div>
    );
}

