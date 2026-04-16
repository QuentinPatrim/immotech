"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber as formatPrice } from "@/lib/formatters";
import { Calculator, Wallet, TrendingUp, AlertCircle, Percent, Clock, Key, Sparkles, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

/* ============================================================
   PATRIM · Charte couleurs
   ============================================================ */
const COLORS = {
    primary: "#8a0e01",   // ROUGE PATRIM
    secondary: "#d35f52", // ROSE PATRIM
    gray: "#393939",      // GRIS PATRIM
};

export default function SimulateurAcquereur() {
    const params = useParams();
    const searchParams = useSearchParams();

    const estimationId = params.id as string;
    const initialPrice = Number(searchParams.get("price")) || 0;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // --- INPUTS UTILISATEUR ---
    const [downPayment, setDownPayment] = useState<number>(0);
    const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
    const [worksBudget, setWorksBudget] = useState<number>(0);
    const [loanDuration, setLoanDuration] = useState<number>(25);
    const [interestRate, setInterestRate] = useState<number>(3.5);

    // --- OPTION LOCATIVE ---
    const [isRental, setIsRental] = useState<boolean>(false);
    const [expectedRent, setExpectedRent] = useState<number>(0);

    // --- GRAPHIQUE INTERACTIF ---
    const [selectedYear, setSelectedYear] = useState<number>(1);
    const [isHovering, setIsHovering] = useState<boolean>(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!estimationId) return;
        const fetchData = async () => {
            const { data: estim } = await supabase.from('estimations').select('data_json').eq('id', estimationId).single();
            if (estim && estim.data_json) {
                setData(estim.data_json);
                setExpectedRent(estim.data_json.monthlyRent || 0);
            }
            setLoading(false);
        };
        fetchData();
    }, [estimationId]);

    // --- CALCULS FINANCIERS ---
    const price = initialPrice > 0 ? initialPrice : (data?.highPrice || 0);
    const notaryFees = price * 0.075;
    const totalProject = price + notaryFees + worksBudget;
    const loanAmount = Math.max(0, totalProject - downPayment);

    const safeDuration = Math.max(1, loanDuration);
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = safeDuration * 12;

    let monthlyPayment = 0;
    if (loanAmount > 0 && numPayments > 0) {
        monthlyPayment = monthlyRate > 0 ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments)) : loanAmount / numPayments;
    }

    const debtRatio = monthlyIncome > 0 ? (monthlyPayment / monthlyIncome) * 100 : 0;
    const isEligible = debtRatio > 0 && debtRatio <= 35;

    const monthlyCharges = (data?.coproFees || 0) + ((data?.taxeFonciere || 0) / 12);
    const monthlyBalance = expectedRent - monthlyPayment - monthlyCharges;
    const netYield = totalProject > 0 ? (((expectedRent * 12) - (monthlyCharges * 12)) / totalProject) * 100 : 0;

    // --- TABLEAU D'AMORTISSEMENT ---
    const amortizationSchedule = useMemo(() => {
        let schedule = [];
        let balance = loanAmount;
        let cumulativeInterest = 0;
        let cumulativePrincipal = 0;

        schedule.push({ year: 0, balance, cumulativeInterest, cumulativePrincipal });

        for (let y = 1; y <= safeDuration; y++) {
            for (let m = 1; m <= 12; m++) {
                const interestMonth = balance * monthlyRate;
                const principalMonth = monthlyPayment - interestMonth;
                balance -= principalMonth;
                cumulativeInterest += interestMonth;
                cumulativePrincipal += principalMonth;
            }
            schedule.push({
                year: y,
                balance: Math.max(0, balance),
                cumulativeInterest,
                cumulativePrincipal
            });
        }
        return schedule;
    }, [loanAmount, safeDuration, monthlyRate, monthlyPayment]);

    const currentYearData = amortizationSchedule[selectedYear] || amortizationSchedule[0];
    const totalInterestPaid = amortizationSchedule[amortizationSchedule.length - 1]?.cumulativeInterest || 0;

    // --- INTERACTION GRAPHIQUE ---
    const handleChartInteraction = (clientX: number) => {
        if (!chartContainerRef.current) return;
        const rect = chartContainerRef.current.getBoundingClientRect();
        let x = clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        const percentage = x / rect.width;
        let year = Math.round(percentage * safeDuration);
        year = Math.max(1, Math.min(year, safeDuration));
        setSelectedYear(year);
    };

    const handleTouchMove = (e: React.TouchEvent) => handleChartInteraction(e.touches[0].clientX);
    const handleMouseMove = (e: React.MouseEvent) => handleChartInteraction(e.clientX);

    // --- CONSTRUCTION DU SVG (amélioré avec courbes Bézier pour un rendu plus smooth) ---
    const svgWidth = 1000;
    const svgHeight = 280;
    const svgPadding = { top: 20, bottom: 20 };
    const chartHeight = svgHeight - svgPadding.top - svgPadding.bottom;

    // Génère une courbe lissée (Catmull-Rom -> Bézier)
    const smoothPath = (points: { x: number; y: number }[]) => {
        if (points.length < 2) return "";
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i - 1] || points[i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || p2;
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return d;
    };

    const balancePoints: { x: number; y: number }[] = [];
    const interestPoints: { x: number; y: number }[] = [];
    const principalPoints: { x: number; y: number }[] = [];

    if (loanAmount > 0) {
        const maxScale = Math.max(loanAmount, totalInterestPaid);
        amortizationSchedule.forEach((d, i) => {
            const x = (i / safeDuration) * svgWidth;
            balancePoints.push({ x, y: svgPadding.top + chartHeight - ((d.balance / loanAmount) * chartHeight) });
            interestPoints.push({ x, y: svgPadding.top + chartHeight - ((d.cumulativeInterest / maxScale) * chartHeight) });
            principalPoints.push({ x, y: svgPadding.top + chartHeight - ((d.cumulativePrincipal / loanAmount) * chartHeight) });
        });
    }

    const balancePath = smoothPath(balancePoints);
    const interestPath = smoothPath(interestPoints);
    const principalPath = smoothPath(principalPoints);

    const currentX = (selectedYear / safeDuration) * svgWidth;
    const currentBalanceY = balancePoints[selectedYear]?.y || svgPadding.top + chartHeight;
    const currentInterestY = interestPoints[selectedYear]?.y || svgPadding.top + chartHeight;

    // Pourcentage progression prêt
    const progressPercent = loanAmount > 0 ? ((loanAmount - currentYearData.balance) / loanAmount) * 100 : 0;

    if (loading) return (
        <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <img src="/logo-patrim.png" className="h-12 object-contain animate-pulse" alt="Patrim"/>
                <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-bold">Chargement…</p>
            </div>
        </div>
    );
    if (!data) return <div className="min-h-screen bg-[#faf8f6] text-zinc-900 p-10 font-sans">Bien introuvable.</div>;

    return (
        <div className="min-h-screen bg-[#faf8f6] text-zinc-900 font-sans pb-20 selection:bg-[#d35f52]/30 relative overflow-hidden">
            {/* Halos décoratifs d'ambiance */}
            <div className="pointer-events-none fixed top-0 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20" style={{ background: `radial-gradient(circle, ${COLORS.secondary} 0%, transparent 70%)` }}/>
            <div className="pointer-events-none fixed top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15" style={{ background: `radial-gradient(circle, ${COLORS.primary} 0%, transparent 70%)` }}/>

            {/* ============================================================
                HERO MOBILE — Layout en flux (tout en pile, pas d'absolute)
                ============================================================ */}
            <div className="md:hidden">
                {/* Photo + badges overlay */}
                <div className="relative w-full h-[42vh] min-h-[320px] overflow-hidden">
                    <img src={data.mainPhoto} className="w-full h-full object-cover" alt="Bien" />
                    {/* Overlay sombre renforcé en bas pour lisibilité du titre */}
                    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.75) 100%)` }} />
                    <div className="absolute inset-0 mix-blend-overlay opacity-25" style={{ background: `linear-gradient(135deg, ${COLORS.primary}00 0%, ${COLORS.primary}50 100%)` }} />

                    {/* Badge Logo */}
                    <div className="absolute top-5 left-5 flex items-center gap-2.5 bg-white/90 backdrop-blur-xl p-2.5 pr-4 rounded-2xl border border-white/60 shadow-xl">
                        <img src="/logo-patrim.png" className="h-7 object-contain" alt="Patrim"/>
                        <div className="h-5 w-px bg-zinc-300"/>
                        <div className="flex flex-col">
                            <span className="text-[8px] uppercase tracking-[0.25em] font-bold text-zinc-500 leading-none">Patrim</span>
                            <span className="text-[9px] uppercase tracking-widest font-black leading-tight" style={{ color: COLORS.primary }}>Simulation</span>
                        </div>
                    </div>

                    {/* Badge live */}
                    <div className="absolute top-5 right-5 flex items-center gap-1.5 bg-white/90 backdrop-blur-xl px-3 py-2 rounded-full border border-white/60 shadow-lg">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: COLORS.secondary }}/>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: COLORS.primary }}/>
                        </span>
                        <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-700">Live</span>
                    </div>

                    {/* Titre + adresse en bas du hero — sur overlay sombre */}
                    <div className="absolute bottom-5 left-5 right-5 text-white">
                        <p className="text-[9px] uppercase tracking-[0.25em] font-black mb-1.5 flex items-center gap-2" style={{ color: COLORS.secondary, textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>
                            <TrendingUp size={12}/> Simulateur Financier
                        </p>
                        <h1 className="font-serif text-3xl font-bold leading-tight" style={{ textShadow: '0 4px 16px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.5)' }}>
                            {data.propertyType} {data.rooms > 0 && `T${data.rooms}`}
                        </h1>
                    </div>
                </div>

                {/* Cartouche prix — EN FLUX NORMAL juste après le hero, pas d'overlap */}
                <div className="px-5 mt-4">
                    <div className="bg-white rounded-2xl border border-white shadow-[0_20px_50px_-15px_rgba(138,14,1,0.35)] overflow-hidden">
                        <div className="px-5 pt-3 pb-2 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                            <span className="text-[9px] uppercase tracking-[0.3em] font-black text-white">
                                Prix de Présentation
                            </span>
                            <span className="text-[8px] uppercase tracking-widest font-bold text-white/80 bg-white/15 px-2 py-0.5 rounded-full">FAI</span>
                        </div>
                        <div className="px-5 py-4">
                            <p className="font-black tracking-tighter leading-none text-zinc-900 text-5xl">
                                {formatPrice(price)}
                                <span className="ml-2 text-2xl font-black align-top" style={{ color: COLORS.primary }}>€</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================================
                HERO DESKTOP — Layout avec chevauchement premium
                ============================================================ */}
            <div className="hidden md:block relative h-[52vh] min-h-[480px] w-full overflow-hidden">
                <img src={data.mainPhoto} className="w-full h-full object-cover" alt="Bien" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 50%, #faf8f6 100%)` }} />
                <div className="absolute inset-0 mix-blend-overlay opacity-30" style={{ background: `linear-gradient(135deg, ${COLORS.primary}00 0%, ${COLORS.primary}40 100%)` }} />

                {/* Badge Logo */}
                <div className="absolute top-6 left-6 flex items-center gap-3 bg-white/85 backdrop-blur-xl p-3 pr-5 rounded-2xl border border-white/60 shadow-xl">
                    <img src="/logo-patrim.png" className="h-8 object-contain" alt="Patrim"/>
                    <div className="h-6 w-px bg-zinc-300"/>
                    <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-[0.25em] font-bold text-zinc-500 leading-none">Patrim</span>
                        <span className="text-[10px] uppercase tracking-widest font-black leading-tight" style={{ color: COLORS.primary }}>Simulation</span>
                    </div>
                </div>

                {/* Badge live */}
                <div className="absolute top-6 right-6 flex items-center gap-2 bg-white/85 backdrop-blur-xl px-4 py-2.5 rounded-full border border-white/60 shadow-lg">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: COLORS.secondary }}/>
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: COLORS.primary }}/>
                    </span>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-700">Simulation Live</span>
                </div>

                {/* Titre + cartouche prix empilés verticalement, ancrés en bas */}
                <div className="absolute bottom-8 left-6 right-6">
                    <div className="text-white mb-4">
                        <p className="text-[10px] uppercase tracking-[0.25em] font-bold mb-2 flex items-center gap-2 opacity-95 drop-shadow-md">
                            <TrendingUp size={14} style={{ color: COLORS.secondary }}/> Simulateur Financier Acquéreur
                        </p>
                        <h1 className="font-serif text-3xl font-bold leading-tight drop-shadow-xl">
                            {data.propertyType} {data.rooms > 0 && `T${data.rooms}`}
                        </h1>
                    </div>

                    {/* Cartouche prix — inline-flex pour qu'il prenne juste sa taille */}
                    <div className="inline-flex flex-col bg-white/95 backdrop-blur-2xl rounded-[28px] border border-white shadow-[0_20px_60px_-10px_rgba(138,14,1,0.4)] overflow-hidden">
                        <div className="px-7 pt-3 pb-2 flex items-center justify-between gap-6" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/95">
                                Prix de Présentation
                            </span>
                            <span className="text-[9px] uppercase tracking-widest font-bold text-white/70">FAI</span>
                        </div>
                        <div className="px-7 py-5 bg-white">
                            <p className="font-black tracking-tighter leading-none text-zinc-900 text-7xl">
                                {formatPrice(price)}
                                <span className="ml-2 text-4xl font-black align-top" style={{ color: COLORS.primary }}>€</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================================
                CARDS INTERACTIVES
               ============================================================ */}
            <div className="px-5 mt-6 md:-mt-16 relative z-10 space-y-5 max-w-2xl mx-auto">

                {/* ---------- 1. DONNÉES DU PROJET ---------- */}
                <div className="bg-white/80 backdrop-blur-2xl p-7 rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(138,14,1,0.15)] space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-800 flex items-center gap-2">
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                <Wallet size={14} className="text-white"/>
                            </span>
                            Votre Projet
                        </h2>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400">01 / 04</span>
                    </div>

                    <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-wider">Revenus nets mensuels (€)</label>
                        <Input
                            type="number"
                            value={monthlyIncome||""}
                            onChange={e=>setMonthlyIncome(Number(e.target.value))}
                            className="bg-white border-zinc-200 h-14 text-xl text-zinc-900 font-black focus:border-[#8a0e01] focus:ring-2 focus:ring-[#d35f52]/20 rounded-2xl transition-all"
                            placeholder="Ex: 4500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-wider">Apport Personnel</label>
                            <Input
                                type="number"
                                value={downPayment||""}
                                onChange={e=>setDownPayment(Number(e.target.value))}
                                className="bg-white border-zinc-200 h-12 text-base text-zinc-900 font-bold focus:border-[#8a0e01] focus:ring-2 focus:ring-[#d35f52]/20 rounded-xl transition-all"
                                placeholder="Ex: 20 000"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-wider">Budget Travaux</label>
                            <Input
                                type="number"
                                value={worksBudget||""}
                                onChange={e=>setWorksBudget(Number(e.target.value))}
                                className="bg-white border-zinc-200 h-12 text-base text-zinc-900 font-bold focus:border-[#8a0e01] focus:ring-2 focus:ring-[#d35f52]/20 rounded-xl transition-all"
                                placeholder="Optionnel"
                            />
                        </div>
                    </div>

                    {/* Récap coût total projet */}
                    <div className="pt-5 border-t border-zinc-200/70 grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1">Bien</p>
                            <p className="text-sm font-black text-zinc-800">{formatPrice(Math.round(price))}<span className="text-[10px] font-bold opacity-60"> €</span></p>
                        </div>
                        <div>
                            <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1">Notaire (7,5%)</p>
                            <p className="text-sm font-black text-zinc-800">{formatPrice(Math.round(notaryFees))}<span className="text-[10px] font-bold opacity-60"> €</span></p>
                        </div>
                        <div>
                            <p className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: COLORS.primary }}>Projet Total</p>
                            <p className="text-sm font-black" style={{ color: COLORS.primary }}>{formatPrice(Math.round(totalProject))}<span className="text-[10px] font-bold opacity-60"> €</span></p>
                        </div>
                    </div>
                </div>

                {/* ---------- 2. PARAMÈTRES CRÉDIT ---------- */}
                <div className="bg-white/80 backdrop-blur-2xl p-7 rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(138,14,1,0.15)] space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-800 flex items-center gap-2">
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                <Clock size={14} className="text-white"/>
                            </span>
                            Hypothèse Bancaire
                        </h2>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400">02 / 04</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 flex items-center gap-1.5 tracking-wider"><Clock size={11}/> Durée (Années)</label>
                            <Input type="number" value={loanDuration||""} onChange={e=>setLoanDuration(Number(e.target.value))} className="bg-white border-zinc-200 h-12 text-lg text-zinc-900 focus:border-[#8a0e01] focus:ring-2 focus:ring-[#d35f52]/20 text-center font-black rounded-xl transition-all"/>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 flex items-center gap-1.5 tracking-wider"><Percent size={11}/> Taux d'intérêt</label>
                            <Input type="number" step="0.1" value={interestRate||""} onChange={e=>setInterestRate(Number(e.target.value))} className="bg-white border-zinc-200 h-12 text-lg text-center font-black rounded-xl focus:ring-2 focus:ring-[#d35f52]/20 transition-all" style={{ color: COLORS.primary, borderColor: "#e4e4e7" }} />
                        </div>
                    </div>

                    {/* Bloc Mensualité + Endettement */}
                    <div className="pt-5 border-t border-zinc-200/70 flex justify-between items-end gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Mensualité Prêt</p>
                            <p className="text-4xl font-black tracking-tighter text-zinc-900">
                                {formatPrice(Math.round(monthlyPayment))}
                                <span className="text-sm text-zinc-500 font-medium"> €/m</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Endettement</p>
                            <div className={`px-4 py-2 rounded-xl text-base font-black inline-flex items-center gap-2 transition-all ${
                                debtRatio > 35
                                    ? 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-700 border border-rose-200'
                                    : debtRatio > 0
                                    ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200'
                                    : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                            }`}>
                                {debtRatio > 35 && <AlertCircle size={14}/>}
                                {monthlyIncome > 0 ? debtRatio.toFixed(1) + "%" : "—"}
                            </div>
                        </div>
                    </div>

                    {/* Jauge d'endettement */}
                    {monthlyIncome > 0 && (
                        <div className="pt-2">
                            <div className="relative h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                                    style={{
                                        width: `${Math.min(debtRatio, 100)}%`,
                                        background: debtRatio > 35
                                            ? `linear-gradient(90deg, ${COLORS.secondary}, ${COLORS.primary})`
                                            : `linear-gradient(90deg, #10b981, #059669)`
                                    }}
                                />
                                {/* Marqueur seuil 35% */}
                                <div className="absolute top-0 bottom-0 w-px bg-zinc-400" style={{ left: '35%' }}/>
                            </div>
                            <div className="flex justify-between mt-1.5 text-[8px] uppercase tracking-wider font-bold text-zinc-400">
                                <span>0%</span>
                                <span>Seuil HCSF · 35%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ---------- 3. GRAPHIQUE AMORTISSEMENT PREMIUM ---------- */}
                {loanAmount > 0 && (
                    <div className="bg-white/80 backdrop-blur-2xl p-7 rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(138,14,1,0.15)]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2" style={{ color: COLORS.primary }}>
                                <span className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                    <TrendingUp size={14} className="text-white"/>
                                </span>
                                Amortissement
                            </h2>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#8a0e01]/10 to-[#d35f52]/10 border border-[#d35f52]/20">
                                <Sparkles size={10} style={{ color: COLORS.primary }}/>
                                <span className="text-[9px] uppercase tracking-widest font-black" style={{ color: COLORS.primary }}>Interactif</span>
                            </div>
                        </div>

                        {/* Afficheur temps réel */}
                        <div className="mb-6 p-5 rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-zinc-50 to-white shadow-inner">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 flex items-center gap-2">
                                    <Clock size={12}/> Fin d'année
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Année</span>
                                    <span className="font-mono text-white text-sm font-black px-2.5 py-1 rounded-lg shadow-md" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                        {selectedYear.toString().padStart(2, '0')}
                                    </span>
                                </div>
                            </div>

                            {/* Barre de progression du prêt */}
                            <div className="mb-5">
                                <div className="flex justify-between items-baseline mb-1.5">
                                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500">Progression remboursement</span>
                                    <span className="text-sm font-black font-mono" style={{ color: COLORS.primary }}>{progressPercent.toFixed(1)}%</span>
                                </div>
                                <div className="relative h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
                                        style={{
                                            width: `${progressPercent}%`,
                                            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-white border border-zinc-200/70">
                                    <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1 tracking-widest">Capital Restant</p>
                                    <p className="text-xl font-black text-zinc-900 tracking-tight font-mono">
                                        {formatPrice(Math.round(currentYearData.balance))}
                                        <span className="text-xs font-bold text-zinc-400"> €</span>
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/50">
                                    <p className="text-[9px] text-emerald-600 uppercase font-bold mb-1 tracking-widest flex items-center gap-1">
                                        <ArrowUpRight size={10}/> Capital Amorti
                                    </p>
                                    <p className="text-xl font-black text-emerald-700 tracking-tight font-mono">
                                        +{formatPrice(Math.round(currentYearData.cumulativePrincipal))}
                                        <span className="text-xs font-bold text-emerald-500"> €</span>
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 p-3 rounded-xl border" style={{ background: `linear-gradient(135deg, ${COLORS.primary}08, ${COLORS.secondary}12)`, borderColor: `${COLORS.secondary}30` }}>
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] uppercase font-bold tracking-widest" style={{ color: COLORS.primary }}>
                                        Intérêts Payés (cumulé)
                                    </p>
                                    <p className="text-xl font-black tracking-tight font-mono" style={{ color: COLORS.primary }}>
                                        {formatPrice(Math.round(currentYearData.cumulativeInterest))}
                                        <span className="text-xs font-bold opacity-60"> €</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ================================================
                            LE GRAPHIQUE — SVG PREMIUM
                           ================================================ */}
                        <div
                            className="relative w-full cursor-crosshair touch-none select-none"
                            ref={chartContainerRef}
                            onTouchMove={handleTouchMove}
                            onMouseMove={handleMouseMove}
                            onMouseEnter={() => setIsHovering(true)}
                            onMouseLeave={() => setIsHovering(false)}
                            onClick={(e) => handleChartInteraction(e.clientX)}
                        >
                            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56 overflow-visible" preserveAspectRatio="none">
                                <defs>
                                    {/* Gradient Capital Restant (gris -> transparent) */}
                                    <linearGradient id="gradBalance" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor={COLORS.gray} stopOpacity="0.25"/>
                                        <stop offset="100%" stopColor={COLORS.gray} stopOpacity="0"/>
                                    </linearGradient>
                                    {/* Gradient Intérêts (rouge PATRIM -> transparent) */}
                                    <linearGradient id="gradInterest" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.35"/>
                                        <stop offset="60%" stopColor={COLORS.secondary} stopOpacity="0.15"/>
                                        <stop offset="100%" stopColor={COLORS.secondary} stopOpacity="0"/>
                                    </linearGradient>
                                    {/* Gradient Trait Capital */}
                                    <linearGradient id="gradBalanceLine" x1="0" x2="1" y1="0" y2="0">
                                        <stop offset="0%" stopColor={COLORS.gray}/>
                                        <stop offset="100%" stopColor="#1a1a1a"/>
                                    </linearGradient>
                                    {/* Gradient Trait Intérêts */}
                                    <linearGradient id="gradInterestLine" x1="0" x2="1" y1="0" y2="0">
                                        <stop offset="0%" stopColor={COLORS.primary}/>
                                        <stop offset="100%" stopColor={COLORS.secondary}/>
                                    </linearGradient>
                                    {/* Glow point capital */}
                                    <filter id="glowDot" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                                        <feMerge>
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                        </feMerge>
                                    </filter>
                                </defs>

                                {/* Grille horizontale */}
                                {[0.25, 0.5, 0.75].map((r, i) => (
                                    <line
                                        key={i}
                                        x1="0" x2={svgWidth}
                                        y1={svgPadding.top + chartHeight * r}
                                        y2={svgPadding.top + chartHeight * r}
                                        stroke="#e4e4e7"
                                        strokeWidth="1"
                                        strokeDasharray="2 6"
                                    />
                                ))}

                                {/* Grille verticale (années tous les 5 ans) */}
                                {Array.from({ length: Math.floor(safeDuration / 5) + 1 }, (_, i) => i * 5).filter(y => y > 0 && y < safeDuration).map(y => (
                                    <line
                                        key={y}
                                        x1={(y / safeDuration) * svgWidth}
                                        x2={(y / safeDuration) * svgWidth}
                                        y1={svgPadding.top}
                                        y2={svgPadding.top + chartHeight}
                                        stroke="#e4e4e7"
                                        strokeWidth="1"
                                        strokeDasharray="2 6"
                                        opacity="0.6"
                                    />
                                ))}

                                {/* Zone sous la courbe Capital Restant */}
                                <path
                                    d={`${balancePath} L ${svgWidth} ${svgPadding.top + chartHeight} L 0 ${svgPadding.top + chartHeight} Z`}
                                    fill="url(#gradBalance)"
                                />

                                {/* Zone sous la courbe Intérêts */}
                                <path
                                    d={`${interestPath} L ${svgWidth} ${svgPadding.top + chartHeight} L 0 ${svgPadding.top + chartHeight} Z`}
                                    fill="url(#gradInterest)"
                                />

                                {/* Courbe Capital Restant */}
                                <path
                                    d={balancePath}
                                    fill="none"
                                    stroke="url(#gradBalanceLine)"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />

                                {/* Courbe Intérêts */}
                                <path
                                    d={interestPath}
                                    fill="none"
                                    stroke="url(#gradInterestLine)"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />

                                {/* Ligne verticale interactive */}
                                <line
                                    x1={currentX} y1={svgPadding.top}
                                    x2={currentX} y2={svgPadding.top + chartHeight}
                                    stroke={COLORS.primary}
                                    strokeWidth="1.5"
                                    strokeDasharray="4 4"
                                    opacity="0.6"
                                />

                                {/* Point sur la courbe des intérêts */}
                                <circle cx={currentX} cy={currentInterestY} r="5" fill={COLORS.primary} opacity="0.3"/>
                                <circle cx={currentX} cy={currentInterestY} r="4" fill={COLORS.secondary} filter="url(#glowDot)"/>
                                <circle cx={currentX} cy={currentInterestY} r="2" fill="#fff"/>

                                {/* Point sur la courbe capital — halo blanc + anneau rouge */}
                                <circle cx={currentX} cy={currentBalanceY} r="14" fill="white" opacity="0.9"/>
                                <circle cx={currentX} cy={currentBalanceY} r="9" fill="white" stroke={COLORS.primary} strokeWidth="2.5"/>
                                <circle cx={currentX} cy={currentBalanceY} r="3.5" fill={COLORS.primary}/>
                            </svg>

                            {/* Tooltip flottant (suit la ligne verticale) */}
                            <div
                                className="absolute -top-2 transform -translate-x-1/2 bg-zinc-900 text-white px-3 py-1.5 rounded-lg shadow-xl pointer-events-none transition-opacity duration-200 whitespace-nowrap"
                                style={{
                                    left: `${(selectedYear / safeDuration) * 100}%`,
                                    opacity: isHovering ? 1 : 0,
                                }}
                            >
                                <p className="text-[9px] uppercase tracking-widest font-bold opacity-60">An {selectedYear}</p>
                                <p className="text-xs font-black font-mono">{formatPrice(Math.round(currentYearData.balance))} €</p>
                                <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45"/>
                            </div>
                        </div>

                        {/* Axe X */}
                        <div className="flex justify-between mt-2 px-0 text-[9px] font-mono font-bold text-zinc-400">
                            <span>An 0</span>
                            <span>An {Math.floor(safeDuration / 2)}</span>
                            <span>An {safeDuration}</span>
                        </div>

                        <p className="text-center text-[9px] text-zinc-400 uppercase tracking-widest font-bold mt-5 mb-6 flex items-center justify-center gap-2">
                            <span className="hidden md:inline">Glissez votre souris</span>
                            <span className="md:hidden">Glissez votre doigt</span>
                            · Temps réel
                        </p>

                        {/* Légende premium */}
                        <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-zinc-200/70">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100/70 border border-zinc-200">
                                <span className="w-3 h-3 rounded-sm" style={{ background: `linear-gradient(135deg, ${COLORS.gray}, #1a1a1a)` }}/>
                                <span className="text-[10px] text-zinc-700 font-bold uppercase tracking-wider">Capital Restant</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ background: `${COLORS.secondary}0D`, borderColor: `${COLORS.secondary}30` }}>
                                <span className="w-3 h-3 rounded-sm" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}/>
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: COLORS.primary }}>Intérêts Cumulés</span>
                            </div>
                        </div>

                        {/* Synthèse bas de carte */}
                        <div className="mt-5 pt-5 border-t border-zinc-200/70 grid grid-cols-2 gap-3 text-center">
                            <div>
                                <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1">Coût total du crédit</p>
                                <p className="text-lg font-black font-mono" style={{ color: COLORS.primary }}>
                                    {formatPrice(Math.round(totalInterestPaid))}
                                    <span className="text-[10px] opacity-60"> €</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-1">Coût total du projet</p>
                                <p className="text-lg font-black text-zinc-900 font-mono">
                                    {formatPrice(Math.round(totalProject + totalInterestPaid - loanAmount + loanAmount))}
                                    <span className="text-[10px] opacity-60"> €</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------- 4. OPTION LOCATIVE ---------- */}
                <div className="bg-white/80 backdrop-blur-2xl p-7 rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(138,14,1,0.15)] space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-800 flex items-center gap-2">
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                <Key size={14} className="text-white"/>
                            </span>
                            Projet Locatif
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400">04 / 04</span>
                            <Switch checked={isRental} onCheckedChange={setIsRental} />
                        </div>
                    </div>

                    {isRental && (
                        <div className="pt-4 border-t border-zinc-200/70 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-wider">Loyer Mensuel Estimé (€ HC)</label>
                                <Input
                                    type="number"
                                    value={expectedRent||""}
                                    onChange={e=>setExpectedRent(Number(e.target.value))}
                                    className="bg-white border-zinc-200 h-14 text-2xl font-black rounded-2xl text-center focus:ring-2 focus:ring-[#d35f52]/20 transition-all"
                                    style={{ color: COLORS.primary }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl text-center border" style={{ background: `linear-gradient(135deg, ${COLORS.primary}08, ${COLORS.secondary}12)`, borderColor: `${COLORS.secondary}30` }}>
                                    <p className="text-[9px] uppercase font-bold mb-2 tracking-widest" style={{ color: COLORS.primary }}>Renta Nette</p>
                                    <p className="text-2xl font-black font-mono" style={{ color: COLORS.primary }}>
                                        {netYield.toFixed(2)}
                                        <span className="text-sm opacity-70"> %</span>
                                    </p>
                                </div>
                                <div className={`p-4 rounded-2xl border text-center ${
                                    monthlyBalance >= 0
                                        ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200'
                                        : 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200'
                                }`}>
                                    <p className={`text-[9px] uppercase font-bold mb-2 tracking-widest ${monthlyBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {monthlyBalance >= 0 ? "Cash-Flow" : "Effort Épargne"}
                                    </p>
                                    <p className={`text-2xl font-black tracking-tighter font-mono ${monthlyBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {monthlyBalance >= 0 ? '+' : ''}{formatPrice(Math.round(monthlyBalance))}
                                        <span className="text-xs font-medium opacity-70"> €/m</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* FOOTER PREMIUM */}
            <div className="text-center mt-12 pb-10 relative z-10">
                <div className="inline-flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80">
                    <img src="/logo-patrim.png" className="h-6 object-contain opacity-80" alt="Patrim"/>
                    <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-zinc-500">
                        Outil d'aide à la décision · Non contractuel
                    </p>
                </div>
            </div>
        </div>
    );
}