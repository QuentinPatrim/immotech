"use client";

import { motion } from "framer-motion";
import { MapPin, Ruler, BedDouble, Building, Leaf, TrendingUp, TrendingDown, Sparkles, ShieldAlert, Target, Clock, CheckCircle2, Scale, ArrowDownRight, Megaphone, Camera, Globe2 } from "lucide-react";
import MarketBar from "@/components/rdv/MarketBar";
import { PATRIM_AGENTS } from "@/lib/dossier";

/* ============================================================
   PRÉSENTATION CLIENT (mode rendez-vous et lien partagé)
   Rendu « écran client » d'un dossier : aucune donnée interne
   (suivi, notes, collaborateurs). Deux parcours :
   - vendeur : valeur estimée, marché, atouts, stratégie de vente ;
   - acquéreur : prix demandé face à la valeur, marge de
     négociation, marché, points d'attention.
   ============================================================ */

export type MeetingMode = "vendeur" | "acquereur";

export interface PresentationComparable {
    id: string; address: string; surface: number; price: number; photoUrl?: string;
    soldDate?: string; distance?: number; rooms?: number; portal?: string;
    publishedAt?: string; firstSeenAt?: string; initialPrice?: number;
}

export interface PresentationData {
    propertyAddress?: string;
    propertyType?: string;
    surface?: number;
    rooms?: number;
    floor?: string;
    hasElevator?: boolean;
    buildYear?: number;
    dpe?: string;
    mainPhoto?: string;
    amenities?: string[];
    strengths?: string[];
    weaknesses?: string[];
    agentAnalysis?: string;
    lowPrice?: number;
    highPrice?: number;
    soldComparables?: PresentationComparable[];
    forSaleComparables?: PresentationComparable[];
    marketStats?: { count: number; median: number; p25: number; p75: number; radius?: number; years?: number[] } | null;
    agentId?: string;
    express?: { adjustments?: { label: string; pct: number }[] } | null;
}

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const k = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2).replace(".", ",")} M€` : `${Math.round(n / 1000).toLocaleString("fr-FR")} k€`);
const DPE_COLORS: Record<string, string> = { A: "#00A06D", B: "#52B153", C: "#A5CC74", D: "#F3E724", E: "#F0B328", F: "#EB8235", G: "#D7221F" };
const AMENITY_LABELS: Record<string, string> = { garage: "Garage", parking: "Parking", cave: "Cave", cellier: "Cellier", balcon: "Balcon", terrasse: "Terrasse", loggia: "Loggia", jardin: "Jardin", piscine: "Piscine" };
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const daysSince = (iso?: string) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000)) : null);

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.div initial={{ opacity: 0.001, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.05 }} transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}>
            {children}
        </motion.div>
    );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
    return (
        <div className="mb-5">
            <p className="text-[10.5px] uppercase tracking-[0.25em] text-[var(--p-accent)] font-semibold">{kicker}</p>
            <h2 className="mp-display text-[28px] sm:text-4xl leading-tight text-[var(--p-fg)] mt-1.5">{title}</h2>
        </div>
    );
}

export default function MeetingPresentation({ data: d, mode, askingPrice }: { data: PresentationData; mode: MeetingMode; askingPrice?: number }) {
    const S = Number(d.surface) || 0;
    const low = Number(d.lowPrice) || 0, high = Number(d.highPrice) || 0;
    const central = low && high ? Math.round((low + high) / 2 / 1000) * 1000 : low || high;
    const sqm = central && S ? Math.round(central / S) : 0;
    const sold = (d.soldComparables || []).filter(c => c.price > 0);
    const forSale = (d.forSaleComparables || []).filter(c => c.price > 0);
    const stats = d.marketStats;
    const saleSqm = median(forSale.filter(c => c.surface).map(c => c.price / c.surface));
    const soldSqm = stats?.median || median(sold.filter(c => c.surface).map(c => c.price / c.surface));
    const listingGap = saleSqm && soldSqm ? (saleSqm - soldSqm) / soldSqm : null;
    const ages = forSale.map(c => daysSince(c.publishedAt || c.firstSeenAt)).filter((v): v is number => v !== null);
    const medAge = ages.length ? median(ages) : null;
    const agent = PATRIM_AGENTS.find(a => a.id === d.agentId);
    const floorLabel = d.floor ? (/rdc|^0$/i.test(d.floor) ? "Rez-de-chaussée" : `${d.floor.replace(/\D/g, "") || d.floor}e étage`) : null;
    const dpe = (d.dpe || "").toUpperCase().slice(0, 1);
    const street = (d.propertyAddress || "").split(",")[0];
    const cityPart = (d.propertyAddress || "").split(",").slice(1).join(",").trim();

    // Parcours acquéreur : prix demandé face à la valeur
    const ask = Number(askingPrice) || 0;
    const gap = ask && central ? (ask - central) / central : null;
    const verdict = gap === null ? null : gap > 0.05 ? "high" : gap < -0.03 ? "opportunity" : "fair";
    const offer = gap === null ? 0 : Math.round(Math.min(ask, verdict === "high" ? central : ask) / 1000) * 1000;

    return (
        <div className="mp-body">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter+Tight:wght@400;500;600;700&display=swap');
                .mp-body { font-family: 'Inter Tight', Inter, sans-serif; }
                .mp-display { font-family: 'Fraunces', Georgia, serif; letter-spacing: -0.01em; }
                .mp-num { font-variant-numeric: tabular-nums; }`}</style>

            {/* ── COUVERTURE ── */}
            <section className="relative min-h-[78vh] sm:min-h-[86vh] flex items-end overflow-hidden">
                {d.mainPhoto
                    ? <img src={d.mainPhoto} alt="" className="absolute inset-0 w-full h-full object-cover"/>
                    : <div className="absolute inset-0" style={{ background: "radial-gradient(120% 100% at 20% 0%, #5a1208, #120807 70%)" }}/>}
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,6,6,0.15) 0%, rgba(8,6,6,0.35) 45%, rgba(8,6,6,0.92) 100%)" }}/>
                <div className="relative w-full max-w-5xl mx-auto px-5 sm:px-8 pb-10 sm:pb-14 text-[#fff]">
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                        <span className="inline-flex items-center rounded-2xl bg-[rgba(255,255,255,0.92)] px-3 py-2 mb-8 shadow-lg"><img src="/logo-patrim.png" alt="Patrim" className="h-6 object-contain"/></span>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-[rgba(255,255,255,0.72)] font-semibold">{mode === "vendeur" ? "Avis de valeur" : "Analyse d'achat"}</p>
                        <h1 className="mp-display text-[38px] sm:text-6xl leading-[1.02] mt-3 max-w-3xl">{street || "Votre bien"}</h1>
                        {cityPart && <p className="text-[rgba(255,255,255,0.78)] mt-2 flex items-center gap-1.5 text-sm sm:text-base"><MapPin size={15}/>{cityPart}</p>}
                        <div className="flex flex-wrap gap-2 mt-6">
                            {[
                                d.propertyType && { icon: Building, t: d.propertyType },
                                S > 0 && { icon: Ruler, t: `${S.toLocaleString("fr-FR")} m²` },
                                d.rooms && { icon: BedDouble, t: `${d.rooms} pièces` },
                                floorLabel && { icon: Building, t: `${floorLabel}${d.hasElevator ? " · ascenseur" : ""}` },
                            ].filter(Boolean).map((x, i) => {
                                const it = x as { icon: typeof Ruler; t: string };
                                return <span key={i} className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.14)] backdrop-blur-md border border-[rgba(255,255,255,0.18)]"><it.icon size={13}/>{it.t}</span>;
                            })}
                            {dpe && DPE_COLORS[dpe] && <span className="text-xs sm:text-sm font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: DPE_COLORS[dpe], color: "CDE".includes(dpe) ? "#1a1a1a" : "#fff" }}>DPE {dpe}</span>}
                        </div>
                    </motion.div>
                </div>
            </section>

            <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14 sm:py-20 space-y-20 sm:space-y-28">
                {/* ── VALEUR ── */}
                {mode === "vendeur" ? (
                    <Reveal>
                        <SectionTitle kicker="Notre estimation" title="La valeur de votre bien"/>
                        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
                            <div className="relative overflow-hidden rounded-[32px] p-7 sm:p-10 text-[#fff]" style={{ background: "radial-gradient(120% 140% at 0% 0%, #b3261a 0%, #8a0e01 42%, #240806 100%)", boxShadow: "0 40px 90px -40px rgba(138,14,1,0.6)" }}>
                                <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full opacity-20 blur-3xl bg-[#ffb4a8]"/>
                                <p className="relative text-[10.5px] uppercase tracking-[0.25em] text-[rgba(255,255,255,0.72)] font-semibold">Valeur de marché estimée</p>
                                <p className="relative mp-display mp-num text-[46px] sm:text-7xl leading-none mt-4">{central ? eur(central) : "—"}</p>
                                {low > 0 && high > 0 && <p className="relative mp-num text-sm sm:text-base text-[rgba(255,255,255,0.82)] mt-4">Fourchette de {eur(low)} à {eur(high)}</p>}
                                {sqm > 0 && <p className="relative mp-num inline-block text-xs mt-6 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.14)]">{sqm.toLocaleString("fr-FR")} €/m²</p>}
                            </div>
                            <div className="rounded-[32px] border border-[var(--p-line)] p-7" style={{ backgroundColor: "var(--p-card)" }}>
                                <p className="text-[10.5px] uppercase tracking-[0.2em] text-[var(--p-muted)] font-semibold">Position dans le quartier</p>
                                {stats && sqm ? (
                                    <>
                                        <MarketBar p25={stats.p25} p75={stats.p75} median={stats.median} value={sqm}/>
                                        <p className="text-sm text-[var(--p-fg-2)]">Prix au m² des <b className="mp-num">{stats.count}</b> ventes comparables{stats.radius ? <> à moins de {stats.radius} m</> : null}. Le point rouge situe votre bien.</p>
                                    </>
                                ) : <p className="text-sm text-[var(--p-muted)] mt-4">Référence de marché non disponible.</p>}
                            </div>
                        </div>
                        {d.express?.adjustments && d.express.adjustments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {d.express.adjustments.map(a => (
                                    <span key={a.label} className={`text-xs px-3 py-1.5 rounded-full mp-num ${a.pct >= 0 ? "text-[var(--p-positive)]" : "text-[var(--p-negative)]"}`} style={{ backgroundColor: "var(--p-sunken)" }}>
                                        {a.label} {a.pct > 0 ? "+" : ""}{Math.round(a.pct * 100)} %
                                    </span>
                                ))}
                            </div>
                        )}
                    </Reveal>
                ) : (
                    <Reveal>
                        <SectionTitle kicker="Le bon prix ?" title="Prix demandé face au marché"/>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <Stat label="Prix demandé" value={ask ? eur(ask) : "—"} sub={ask && S ? `${Math.round(ask / S).toLocaleString("fr-FR")} €/m²` : "à saisir"}/>
                            <Stat label="Valeur estimée" value={central ? eur(central) : "—"} sub={sqm ? `${sqm.toLocaleString("fr-FR")} €/m²` : ""}/>
                            <div className="rounded-[28px] p-6 text-[#fff]" style={{ background: verdict === "high" ? "linear-gradient(135deg, #7c2d12, #c2410c)" : verdict === "opportunity" ? "linear-gradient(135deg, #065f46, #10b981)" : "linear-gradient(135deg, #1e293b, #475569)" }}>
                                <p className="text-[10.5px] uppercase tracking-[0.2em] opacity-80 font-semibold">Verdict</p>
                                <p className="mp-display text-2xl mt-2">{verdict === "high" ? "Au-dessus du marché" : verdict === "opportunity" ? "Opportunité" : verdict === "fair" ? "Prix cohérent" : "—"}</p>
                                {gap !== null && <p className="mp-num text-sm opacity-90 mt-1">{gap > 0 ? "+" : ""}{(gap * 100).toFixed(1).replace(".", ",")} % vs notre estimation</p>}
                            </div>
                        </div>
                        {gap !== null && (
                            <div className="mt-4 rounded-[28px] border border-[var(--p-line)] p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between" style={{ backgroundColor: "var(--p-card)" }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--p-accent-soft)" }}><Target size={18} className="text-[var(--p-accent)]"/></div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--p-fg)]">Offre conseillée : <span className="mp-num">{eur(offer)}</span></p>
                                        <p className="text-xs text-[var(--p-muted)]">{verdict === "high" ? `Marge de négociation d'environ ${eur(ask - offer)}, argumentée par les ventes du quartier.` : verdict === "opportunity" ? "Prix sous la valeur de marché : se positionner rapidement." : "Prix aligné sur le marché : marge de négociation limitée."}</p>
                                    </div>
                                </div>
                                {high > 0 && <p className="text-xs text-[var(--p-muted)] mp-num">Plafond conseillé : <b className="text-[var(--p-fg)]">{eur(high)}</b></p>}
                            </div>
                        )}
                    </Reveal>
                )}

                {/* ── MARCHÉ ── */}
                {(sold.length > 0 || forSale.length > 0) && (
                    <Reveal>
                        <SectionTitle kicker="Le marché" title="Ce qui se vend autour"/>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                            <Stat label="Ventes récentes" value={stats?.count ? String(stats.count) : String(sold.length)} sub="actes notariés (DVF)"/>
                            <Stat label="Prix vendu médian" value={soldSqm ? `${Math.round(soldSqm).toLocaleString("fr-FR")} €/m²` : "—"} sub="ventes réelles"/>
                            <Stat label="Prix affiché médian" value={saleSqm ? `${Math.round(saleSqm).toLocaleString("fr-FR")} €/m²` : "—"} sub={listingGap !== null ? `${listingGap > 0 ? "+" : ""}${Math.round(listingGap * 100)} % vs vendu` : "annonces en cours"}/>
                            <Stat label="En ligne depuis" value={medAge !== null ? `${medAge} j` : "—"} sub="médiane des annonces"/>
                        </div>
                        {sold.length > 0 && (
                            <>
                                <p className="text-sm font-semibold text-[var(--p-fg)] mb-3 flex items-center gap-2"><CheckCircle2 size={15} className="text-[var(--p-positive)]"/> Biens vendus comparables</p>
                                <div className="-mx-5 px-5 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible mb-8 [scrollbar-width:none]">
                                    {sold.slice(0, 6).map(c => <div key={c.id} className="snap-start shrink-0 w-[78%] sm:w-auto"><CompCard c={c} kind="sold"/></div>)}
                                </div>
                            </>
                        )}
                        {forSale.length > 0 && (
                            <>
                                <p className="text-sm font-semibold text-[var(--p-fg)] mb-3 flex items-center gap-2"><Globe2 size={15} className="text-[var(--p-accent)]"/> Biens concurrents en vente</p>
                                <div className="-mx-5 px-5 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible [scrollbar-width:none]">
                                    {forSale.slice(0, 6).map(c => <div key={c.id} className="snap-start shrink-0 w-[78%] sm:w-auto"><CompCard c={c} kind="sale"/></div>)}
                                </div>
                            </>
                        )}
                    </Reveal>
                )}

                {/* ── ATOUTS / VIGILANCE ── */}
                {((d.strengths?.length ?? 0) > 0 || (d.weaknesses?.length ?? 0) > 0 || (d.amenities?.length ?? 0) > 0) && (
                    <Reveal>
                        <SectionTitle kicker="Le bien" title={mode === "vendeur" ? "Ce qui fera la différence" : "Atouts et points d'attention"}/>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="rounded-[28px] border border-[var(--p-line)] p-6" style={{ backgroundColor: "var(--p-card)" }}>
                                <p className="text-sm font-semibold text-[var(--p-fg)] flex items-center gap-2 mb-4"><Sparkles size={15} className="text-[var(--p-accent)]"/> Atouts</p>
                                <ul className="space-y-2.5">
                                    {[...(d.strengths || []), ...(d.amenities || []).map(a => AMENITY_LABELS[a] || a).filter(a => !(d.strengths || []).some(s => s.toLowerCase().includes(a.toLowerCase())))].slice(0, 8).map(s => (
                                        <li key={s} className="flex gap-2.5 text-sm text-[var(--p-fg-2)]"><CheckCircle2 size={16} className="shrink-0 mt-0.5 text-[var(--p-positive)]"/>{s}</li>
                                    ))}
                                </ul>
                            </div>
                            {(d.weaknesses?.length ?? 0) > 0 && (
                                <div className="rounded-[28px] border border-[var(--p-line)] p-6" style={{ backgroundColor: "var(--p-card)" }}>
                                    <p className="text-sm font-semibold text-[var(--p-fg)] flex items-center gap-2 mb-4"><ShieldAlert size={15} className="text-[var(--p-warning)]"/> {mode === "vendeur" ? "À anticiper" : "Points d'attention"}</p>
                                    <ul className="space-y-2.5">
                                        {(d.weaknesses || []).slice(0, 6).map(s => (
                                            <li key={s} className="flex gap-2.5 text-sm text-[var(--p-fg-2)]"><span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0 bg-[var(--p-warning)]"/>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        {dpe && "FG".includes(dpe) && (
                            <p className="mt-4 text-sm rounded-2xl px-5 py-4 flex gap-3 text-[var(--p-fg-2)]" style={{ backgroundColor: "var(--p-sunken)" }}>
                                <Leaf size={17} className="shrink-0 text-[var(--p-warning)]"/>
                                DPE {dpe} : location progressivement interdite (G depuis 2025, F en 2028). {mode === "vendeur" ? "Un audit et un chiffrage des travaux rassurent les acquéreurs." : "Prévoir le coût des travaux de rénovation énergétique dans l'offre."}
                            </p>
                        )}
                    </Reveal>
                )}

                {/* ── STRATÉGIE ── */}
                {mode === "vendeur" && central > 0 && (
                    <Reveal>
                        <SectionTitle kicker="Notre stratégie" title="Vendre au bon prix, dans le bon délai"/>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <Stat icon={Megaphone} label="Prix de présentation conseillé" value={eur(high || central)} sub="affichage sur les portails"/>
                            <Stat icon={Scale} label="Prix net vendeur visé" value={eur(central)} sub={high > central ? `marge de négociation ${k(high - central)}` : ""}/>
                            <Stat icon={Clock} label="Délai de vente estimé" value={medAge !== null ? `${Math.max(30, Math.round(medAge * 0.8 / 15) * 15)}–${Math.round(Math.max(60, medAge * 1.3) / 15) * 15} j` : "60–90 j"} sub={medAge !== null ? "au prix du marché, d'après les annonces du quartier" : "au prix du marché"}/>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-3 mt-4">
                            {[
                                { icon: Camera, t: "Photos professionnelles et visite virtuelle" },
                                { icon: Globe2, t: "Diffusion sur les principaux portails dès la signature" },
                                { icon: ArrowDownRight, t: "Suivi des visites et ajustement du prix si nécessaire" },
                            ].map(x => (
                                <div key={x.t} className="rounded-2xl px-4 py-3.5 flex items-center gap-3 text-sm text-[var(--p-fg-2)]" style={{ backgroundColor: "var(--p-sunken)" }}>
                                    <x.icon size={16} className="shrink-0 text-[var(--p-accent)]"/>{x.t}
                                </div>
                            ))}
                        </div>
                    </Reveal>
                )}

                {d.agentAnalysis && (
                    <Reveal>
                        <SectionTitle kicker="Notre analyse" title="L'avis de l'agent"/>
                        <p className="mp-display text-xl sm:text-2xl leading-relaxed text-[var(--p-fg-2)] whitespace-pre-line">{d.agentAnalysis}</p>
                    </Reveal>
                )}

                {/* ── CONTACT ── */}
                <Reveal>
                    <div className="rounded-[32px] p-7 sm:p-10 border border-[var(--p-line)] flex flex-col sm:flex-row sm:items-center justify-between gap-6" style={{ backgroundColor: "var(--p-card)" }}>
                        <div>
                            <p className="text-[10.5px] uppercase tracking-[0.25em] text-[var(--p-accent)] font-semibold">Votre interlocuteur</p>
                            <p className="mp-display text-3xl text-[var(--p-fg)] mt-2">{agent?.name || "Agence Patrim"}</p>
                            <p className="text-sm text-[var(--p-muted)] mt-1">{agent?.role || "Service Transaction"} · Patrim Toulouse</p>
                        </div>
                        {agent?.signatureUrl && <img src={agent.signatureUrl} alt="" className="h-14 object-contain opacity-80 dark-invert"/>}
                    </div>
                    <p className="text-[11px] text-[var(--p-faint)] mt-4">Estimation établie à partir des ventes notariées publiées (DVF) et des biens en vente comparables. Elle ne constitue pas une expertise.</p>
                </Reveal>
            </div>
        </div>
    );
}

function Stat({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon?: typeof TrendingUp }) {
    return (
        <div className="rounded-[24px] border border-[var(--p-line)] p-5" style={{ backgroundColor: "var(--p-card)" }}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--p-muted)] font-semibold flex items-center gap-1.5">{Icon && <Icon size={12} className="text-[var(--p-accent)]"/>}{label}</p>
            <p className="mp-display mp-num text-2xl sm:text-[28px] text-[var(--p-fg)] mt-2 leading-tight">{value}</p>
            {sub && <p className="text-[11px] text-[var(--p-muted)] mt-1">{sub}</p>}
        </div>
    );
}

function CompCard({ c, kind }: { c: PresentationComparable; kind: "sold" | "sale" }) {
    const sqm = c.surface ? Math.round(c.price / c.surface) : 0;
    const age = daysSince(c.publishedAt || c.firstSeenAt);
    const drop = c.initialPrice && c.initialPrice > c.price ? c.initialPrice - c.price : 0;
    return (
        <div className="h-full rounded-[24px] border border-[var(--p-line)] overflow-hidden flex flex-col" style={{ backgroundColor: "var(--p-card)" }}>
            <div className="relative aspect-[16/10] bg-[var(--p-sunken)]">
                {c.photoUrl ? <img src={c.photoUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover"/> : null}
                <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-1 rounded-full bg-[rgba(0,0,0,0.6)] text-[#fff] backdrop-blur-sm">
                    {kind === "sold" ? (c.soldDate ? `Vendu ${new Date(c.soldDate).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}` : "Vendu") : c.portal || "En vente"}
                </span>
                {drop > 0 && <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-1 rounded-full bg-[#be123c] text-[#fff] inline-flex items-center gap-1"><TrendingDown size={10}/> −{k(drop)}</span>}
            </div>
            <div className="p-4">
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-lg font-semibold text-[var(--p-fg)] mp-num">{eur(c.price)}</p>
                    {sqm > 0 && <p className="text-xs text-[var(--p-muted)] mp-num">{sqm.toLocaleString("fr-FR")} €/m²</p>}
                </div>
                <p className="text-xs text-[var(--p-fg-2)] mt-1 truncate">{c.address}</p>
                <p className="text-[11px] text-[var(--p-muted)] mt-1 mp-num">
                    {c.surface ? `${Math.round(c.surface)} m²` : ""}{c.rooms ? ` · ${c.rooms} p.` : ""}{c.distance ? ` · à ${Math.round(c.distance)} m` : ""}{kind === "sale" && age !== null ? ` · en ligne depuis ${age} j` : ""}
                </p>
            </div>
        </div>
    );
}
