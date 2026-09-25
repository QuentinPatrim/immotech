"use client";

import { useState, useEffect, useRef, useMemo, ReactNode } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchSharedEstimation, fetchSharedQrCode } from "@/lib/sharedEstimation";
import { formatNumber as formatPrice } from "@/lib/formatters";
import {
    Calculator, Wallet, TrendingUp, AlertCircle, Percent, Clock, Key,
    Sparkles, ArrowUpRight, ArrowDownRight, Home, Coins, Receipt, PiggyBank,
    Landmark, BadgePercent, Tag, Info, Camera, ArrowRight, ArrowLeft
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

/* ============================================================
   PATRIM · Charte couleurs
   ============================================================ */
const COLORS = {
    primary: "#8a0e01",   // ROUGE PATRIM
    secondary: "#d35f52", // ROSE PATRIM
    gray: "#393939",      // GRIS PATRIM
    wealth: "#059669",    // VERT émeraude (gains / positif)
    wealthLight: "#10b981",
};

/* Hypothèse d'appréciation annuelle du bien (indicative, affichée en bas du graphe) */
const APPRECIATION_RATE = 0.015; // +1,5% / an

/* Jalons interactifs pour le scrubbing */
const MILESTONES = [5, 10, 15, 20];

/* Taux marginal d'imposition par défaut pour le calcul LMNP vs Nu */
const DEFAULT_TMI = 0.30;
const SOCIAL_CHARGES = 0.172; // Prélèvements sociaux sur revenus fonciers

/* Seuil d'alerte bienveillante sur l'offre d'achat */
const OFFER_ALERT_THRESHOLD = -0.10; // -10%

export default function SimulateurAcquereur() {
    const params = useParams();
    const searchParams = useSearchParams();

    const estimationId = params.id as string;
    const initialPrice = Number(searchParams.get("price")) || 0;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // --- PRIX DE RÉFÉRENCE (prix de présentation FAI, non modifiable) ---
    const referencePrice = initialPrice > 0 ? initialPrice : (data?.highPrice || 0);

    // --- COMPTAGE DES PHOTOS DISPONIBLES (pour la mini-preview galerie) ---
    const photoCount = useMemo(() => {
        if (!data) return 0;
        const all = Array.from(new Set([
            data.mainPhoto,
            ...(data.secondaryPhotos || []),
            ...(data.extraPhotos || []),
        ])).filter(Boolean);
        return all.length;
    }, [data]);

    // --- INPUTS UTILISATEUR ---
    const [offerPrice, setOfferPrice] = useState<number>(0);
    const [downPayment, setDownPayment] = useState<number>(0);
    const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
    const [worksBudget, setWorksBudget] = useState<number>(0);
    const [loanDuration, setLoanDuration] = useState<number>(25);
    const [interestRate, setInterestRate] = useState<number>(3.5);

    // --- OPTION LOCATIVE ---
    const [isRental, setIsRental] = useState<boolean>(false);
    const [expectedRent, setExpectedRent] = useState<number>(0);
    const [rentalRegime, setRentalRegime] = useState<"nu" | "lmnp">("nu");

    // --- GRAPHIQUE INTERACTIF ---
    const [selectedYear, setSelectedYear] = useState<number>(1);
    const [isHovering, setIsHovering] = useState<boolean>(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!estimationId) return;
        const fetchData = async () => {
            // --- ÉTAPE 1 : on cherche d'abord dans la table estimations ---
            // (format historique : toutes les données sont dans data_json)
            const estim = { data_json: await fetchSharedEstimation(estimationId) };

            if (estim && estim.data_json) {
                setData(estim.data_json);
                setExpectedRent(estim.data_json.monthlyRent || 0);
                setLoading(false);
                return;
            }

            // --- ÉTAPE 2 : sinon, on cherche dans la table qr_codes ---
            // (nouvelle table : les champs sont à plat en snake_case)
            // On les normalise pour qu'ils ressemblent au format data_json attendu
            // par le reste du simulateur (mainPhoto, highPrice, etc.)
            const qr = await fetchSharedQrCode(estimationId);

            if (qr) {
                const normalized = {
                    propertyAddress: qr.address,
                    propertyType: qr.property_type,
                    rooms: qr.rooms,
                    surface: qr.surface,
                    highPrice: qr.price_fai,
                    mainPhoto: qr.main_photo,
                    secondaryPhotos: [], // pas stockés pour les QR
                    extraPhotos: qr.extra_photos || [],
                    taxeFonciere: qr.taxe_fonciere,
                    coproFees: qr.copro_fees,
                    monthlyRent: qr.monthly_rent,
                    isCopropriete: (qr.copro_fees || 0) > 0,
                    // On fusionne le data_json stocké dans qr_codes s'il contient d'autres champs
                    ...(qr.data_json || {}),
                };
                setData(normalized);
                setExpectedRent(qr.monthly_rent || 0);
            }

            setLoading(false);
        };
        fetchData();
    }, [estimationId]);

    // Pré-remplir le prix d'offre
    useEffect(() => {
        if (referencePrice > 0 && offerPrice === 0) {
            setOfferPrice(referencePrice);
        }
    }, [referencePrice, offerPrice]);

    // --- CALCULS FINANCIERS ---
    const price = offerPrice > 0 ? offerPrice : referencePrice;
    const notaryFees = price * 0.075;
    const totalProject = price + notaryFees + worksBudget;
    const loanAmount = Math.max(0, totalProject - downPayment);

    // --- ÉCART OFFRE vs PRIX DE PRÉSENTATION ---
    const offerDelta = price - referencePrice;
    const offerDeltaPct = referencePrice > 0 ? offerDelta / referencePrice : 0;
    const hasSignificantDiscount = offerDeltaPct <= OFFER_ALERT_THRESHOLD;

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
    const grossYield = totalProject > 0 ? ((expectedRent * 12) / totalProject) * 100 : 0;
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
                cumulativePrincipal,
            });
        }
        return schedule;
    }, [loanAmount, safeDuration, monthlyRate, monthlyPayment]);

    const currentYearData = amortizationSchedule[selectedYear] || amortizationSchedule[0];
    const totalInterestPaid = amortizationSchedule[amortizationSchedule.length - 1]?.cumulativeInterest || 0;
    const indicativeFutureValue = price * Math.pow(1 + APPRECIATION_RATE, selectedYear);

    // --- CALCULS FISCAUX ---
    const annualRent = expectedRent * 12;
    const annualCharges = monthlyCharges * 12;
    const nuTaxableIncome = annualRent * 0.70;
    const nuTax = Math.max(0, nuTaxableIncome * (DEFAULT_TMI + SOCIAL_CHARGES));
    const lmnpTaxableIncome = annualRent * 0.50;
    const lmnpTax = Math.max(0, lmnpTaxableIncome * (DEFAULT_TMI + SOCIAL_CHARGES));
    const currentTax = rentalRegime === "lmnp" ? lmnpTax : nuTax;
    const taxSavingsLmnp = nuTax - lmnpTax;
    const monthlyBalanceAfterTax = monthlyBalance - (currentTax / 12);
    const netNetYield = totalProject > 0 ? ((annualRent - annualCharges - currentTax) / totalProject) * 100 : 0;

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

    // --- CONSTRUCTION DU SVG ---
    const svgWidth = 1000;
    const svgHeight = 280;
    const svgPadding = { top: 20, bottom: 20 };
    const chartHeight = svgHeight - svgPadding.top - svgPadding.bottom;

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
    if (loanAmount > 0) {
        amortizationSchedule.forEach((d, i) => {
            const x = (i / safeDuration) * svgWidth;
            balancePoints.push({
                x,
                y: svgPadding.top + chartHeight - ((d.balance / loanAmount) * chartHeight)
            });
        });
    }

    const balancePath = smoothPath(balancePoints);
    const currentX = (selectedYear / safeDuration) * svgWidth;
    const currentBalanceY = balancePoints[selectedYear]?.y || svgPadding.top + chartHeight;
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

    /* ============================================================
       CARDS RÉUTILISABLES — Extraites en variables pour être
       partagées entre le layout mobile et le layout desktop.
       ============================================================ */

    const ProjectCard = (
        <Card step="01 / 04" title="Votre Projet" icon={<Wallet size={14} className="text-white"/>}>
            {/* Prix d'offre */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5">
                        <Tag size={11}/> Votre Offre d'Achat (€)
                    </label>
                    {offerPrice > 0 && Math.abs(offerDelta) >= 1 && (
                        <span
                            className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all ${
                                offerDelta < 0
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                        >
                            {offerDelta < 0 ? '−' : '+'}{formatPrice(Math.abs(Math.round(offerDelta)))} € · {offerDelta < 0 ? '' : '+'}{(offerDeltaPct * 100).toFixed(1)}%
                        </span>
                    )}
                </div>
                <Input
                    type="number"
                    value={offerPrice || ""}
                    onChange={e => setOfferPrice(Number(e.target.value))}
                    className="bg-white border-zinc-200 h-14 text-2xl font-black rounded-2xl text-center focus:ring-2 focus:ring-[#d35f52]/20 transition-all"
                    style={{ color: COLORS.primary, borderColor: offerDelta !== 0 ? `${COLORS.secondary}40` : undefined }}
                    placeholder={formatPrice(referencePrice)}
                />
                <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[9px] text-zinc-400 font-semibold">
                        Prix affiché : {formatPrice(referencePrice)} € FAI
                    </p>
                    {offerPrice > 0 && offerPrice !== referencePrice && (
                        <button
                            onClick={() => setOfferPrice(referencePrice)}
                            className="text-[9px] font-bold uppercase tracking-widest transition-colors hover:underline"
                            style={{ color: COLORS.primary }}
                        >
                            Réinitialiser
                        </button>
                    )}
                </div>
                {hasSignificantDiscount && (
                    <div className="mt-3 p-3 rounded-xl border flex gap-2.5 animate-in slide-in-from-top-1 fade-in duration-300"
                         style={{ background: `${COLORS.secondary}08`, borderColor: `${COLORS.secondary}40` }}>
                        <div className="flex-shrink-0 mt-0.5">
                            <Info size={14} style={{ color: COLORS.primary }}/>
                        </div>
                        <div>
                            <p className="text-[11px] font-black leading-tight mb-0.5" style={{ color: COLORS.primary }}>
                                Offre inférieure de plus de 10%
                            </p>
                            <p className="text-[10px] text-zinc-600 leading-snug">
                                Un échange avec votre conseiller Patrim peut vous aider à positionner une offre réaliste et à maximiser vos chances d'acceptation.
                            </p>
                        </div>
                    </div>
                )}
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
        </Card>
    );

    const BankCard = (
        <Card step="02 / 04" title="Hypothèse Bancaire" icon={<Clock size={14} className="text-white"/>}>
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
                        <div className="absolute top-0 bottom-0 w-px bg-zinc-400" style={{ left: '35%' }}/>
                    </div>
                    <div className="flex justify-between mt-1.5 text-[8px] uppercase tracking-wider font-bold text-zinc-400">
                        <span>0%</span>
                        <span>Seuil HCSF · 35%</span>
                        <span>100%</span>
                    </div>
                </div>
            )}
        </Card>
    );

    const ChartCard = loanAmount > 0 && (
        <Card
            title="Votre Remboursement"
            titleColor={COLORS.primary}
            icon={<TrendingUp size={14} className="text-white"/>}
            headerRight={
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#8a0e01]/10 to-[#d35f52]/10 border border-[#d35f52]/20">
                    <Sparkles size={10} style={{ color: COLORS.primary }}/>
                    <span className="text-[9px] uppercase tracking-widest font-black" style={{ color: COLORS.primary }}>Interactif</span>
                </div>
            }
        >
            {/* Afficheur temps réel */}
            <div className="p-5 rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-zinc-50 to-white shadow-inner">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 flex items-center gap-2">
                        <Clock size={12}/> Dans
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Année</span>
                        <span className="font-mono text-white text-sm font-black px-2.5 py-1 rounded-lg shadow-md" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                            {selectedYear.toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* KPI héros */}
                <div className="mb-4 p-4 rounded-xl border-2 relative overflow-hidden"
                     style={{
                         background: `linear-gradient(135deg, ${COLORS.wealth}10, ${COLORS.wealthLight}15)`,
                         borderColor: `${COLORS.wealth}40`
                     }}>
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-30" style={{ background: COLORS.wealth }}/>
                    <div className="relative">
                        <p className="text-[9px] uppercase font-black mb-1 tracking-widest flex items-center gap-1.5" style={{ color: COLORS.wealth }}>
                            <PiggyBank size={11}/> Capital déjà remboursé
                        </p>
                        <p className="text-3xl font-black font-mono tracking-tight" style={{ color: COLORS.wealth }}>
                            +{formatPrice(Math.round(currentYearData.cumulativePrincipal))}
                            <span className="text-sm opacity-70"> €</span>
                        </p>
                        <p className="text-[10px] text-zinc-600 font-semibold mt-1">
                            soit <span className="font-black" style={{ color: COLORS.wealth }}>
                                {progressPercent.toFixed(1)}%
                            </span> de votre prêt remboursé
                        </p>
                    </div>
                </div>

                <div className="mb-4">
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
                        <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1 tracking-widest flex items-center gap-1">
                            <ArrowDownRight size={10}/> Il vous reste
                        </p>
                        <p className="text-xl font-black text-zinc-900 tracking-tight font-mono">
                            {formatPrice(Math.round(currentYearData.balance))}
                            <span className="text-xs font-bold text-zinc-400"> €</span>
                        </p>
                    </div>
                    <div className="p-3 rounded-xl border" style={{ background: `linear-gradient(135deg, ${COLORS.primary}08, ${COLORS.secondary}12)`, borderColor: `${COLORS.secondary}30` }}>
                        <p className="text-[9px] uppercase font-bold mb-1 tracking-widest" style={{ color: COLORS.primary }}>
                            Intérêts payés
                        </p>
                        <p className="text-xl font-black tracking-tight font-mono" style={{ color: COLORS.primary }}>
                            {formatPrice(Math.round(currentYearData.cumulativeInterest))}
                            <span className="text-xs font-bold opacity-60"> €</span>
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mr-1">Jalons</span>
                    {MILESTONES.filter(m => m <= safeDuration).map(m => (
                        <button
                            key={m}
                            onClick={() => setSelectedYear(m)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black font-mono transition-all ${
                                selectedYear === m
                                    ? 'text-white shadow-md scale-105'
                                    : 'bg-white text-zinc-600 border border-zinc-200 hover:border-[#d35f52]/50'
                            }`}
                            style={selectedYear === m ? { background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` } : {}}
                        >
                            {m} ans
                        </button>
                    ))}
                    {safeDuration > 0 && (
                        <button
                            onClick={() => setSelectedYear(safeDuration)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black font-mono transition-all ${
                                selectedYear === safeDuration
                                    ? 'text-white shadow-md scale-105'
                                    : 'bg-white text-zinc-600 border border-zinc-200 hover:border-[#d35f52]/50'
                            }`}
                            style={selectedYear === safeDuration ? { background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` } : {}}
                        >
                            Fin
                        </button>
                    )}
                </div>
            </div>

            {/* Graphique SVG */}
            <div
                className="relative w-full cursor-crosshair touch-none select-none"
                ref={chartContainerRef}
                onTouchMove={handleTouchMove}
                onTouchStart={(e) => { setIsHovering(true); handleTouchMove(e); }}
                onTouchEnd={() => setIsHovering(false)}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onClick={(e) => handleChartInteraction(e.clientX)}
            >
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56 lg:h-72 overflow-visible" preserveAspectRatio="none">
                    <defs>
                        {/* Gradient pour l'aire sous courbe uniquement, en coordonnées absolues */}
                        <linearGradient id="gradBalanceArea" x1="0" y1="0" x2="0" y2={svgHeight} gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.28"/>
                            <stop offset="100%" stopColor={COLORS.secondary} stopOpacity="0.02"/>
                        </linearGradient>
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
                        <line key={i} x1="0" x2={svgWidth} y1={svgPadding.top + chartHeight * r} y2={svgPadding.top + chartHeight * r} stroke="#e4e4e7" strokeWidth="1" strokeDasharray="2 6"/>
                    ))}

                    {/* Grille verticale (tous les 5 ans) */}
                    {Array.from({ length: Math.floor(safeDuration / 5) + 1 }, (_, i) => i * 5).filter(y => y > 0 && y < safeDuration).map(y => (
                        <line key={y} x1={(y / safeDuration) * svgWidth} x2={(y / safeDuration) * svgWidth} y1={svgPadding.top} y2={svgPadding.top + chartHeight} stroke="#e4e4e7" strokeWidth="1" strokeDasharray="2 6" opacity="0.6"/>
                    ))}

                    {/* Aire sous courbe avec gradient */}
                    {balancePath && (
                        <path d={`${balancePath} L ${svgWidth} ${svgPadding.top + chartHeight} L 0 ${svgPadding.top + chartHeight} Z`} fill="url(#gradBalanceArea)"/>
                    )}

                    {/* Courbe capital restant dû — couleur solide rouge PATRIM, pas de gradient
                        (le gradient sur stroke posait problème avec preserveAspectRatio=none) */}
                    {balancePath && (
                        <path
                            d={balancePath}
                            fill="none"
                            stroke={COLORS.primary}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    )}

                    {/* Ligne verticale interactive (scrubbing) */}
                    <line x1={currentX} y1={svgPadding.top} x2={currentX} y2={svgPadding.top + chartHeight} stroke={COLORS.primary} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" vectorEffect="non-scaling-stroke"/>

                    {/* Marques jalons sur l'axe X */}
                    {MILESTONES.filter(m => m <= safeDuration).map(m => (
                        <circle key={`ms-${m}`} cx={(m / safeDuration) * svgWidth} cy={svgPadding.top + chartHeight} r="3" fill="#fff" stroke={COLORS.secondary} strokeWidth="1.5" opacity="0.7" vectorEffect="non-scaling-stroke"/>
                    ))}

                    {/* Point de sélection */}
                    <circle cx={currentX} cy={currentBalanceY} r="14" fill="white" opacity="0.9"/>
                    <circle cx={currentX} cy={currentBalanceY} r="9" fill="white" stroke={COLORS.primary} strokeWidth="2.5" vectorEffect="non-scaling-stroke"/>
                    <circle cx={currentX} cy={currentBalanceY} r="3.5" fill={COLORS.primary}/>
                </svg>

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

            <div className="flex justify-between mt-2 px-0 text-[9px] font-mono font-bold text-zinc-400">
                <span>Aujourd'hui</span>
                <span>An {Math.floor(safeDuration / 2)}</span>
                <span>An {safeDuration}</span>
            </div>

            <p className="text-center text-[9px] text-zinc-400 uppercase tracking-widest font-bold mt-4 mb-2 flex items-center justify-center gap-2">
                <span className="hidden md:inline">Glissez votre souris</span>
                <span className="md:hidden">Glissez votre doigt</span>
                · Temps réel
            </p>

            <div className="mt-4 p-3 rounded-xl flex items-start gap-2.5 border border-zinc-200/70 bg-zinc-50/60">
                <div className="flex-shrink-0 mt-0.5">
                    <Home size={13} className="text-zinc-500"/>
                </div>
                <p className="text-[10px] text-zinc-600 leading-relaxed">
                    À titre indicatif, sur une base d'appréciation moyenne de{' '}
                    <span className="font-black">+1,5%/an</span>, votre bien pourrait valoir environ{' '}
                    <span className="font-black" style={{ color: COLORS.wealth }}>
                        {formatPrice(Math.round(indicativeFutureValue))} €
                    </span>{' '}
                    dans {selectedYear} an{selectedYear > 1 ? 's' : ''}.
                </p>
            </div>

            <div className="pt-5 border-t border-zinc-200/70 grid grid-cols-2 gap-3 text-center">
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
                        {formatPrice(Math.round(totalProject + totalInterestPaid))}
                        <span className="text-[10px] opacity-60"> €</span>
                    </p>
                </div>
            </div>
        </Card>
    );

    const RentalCard = (
        <Card
            step="04 / 04"
            title="Projet Locatif"
            icon={<Key size={14} className="text-white"/>}
            headerRight={<Switch checked={isRental} onCheckedChange={setIsRental} />}
        >
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

                    <div className="p-5 rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-zinc-50 to-white">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-600 flex items-center gap-1.5">
                                <Receipt size={11}/> Bilan Mensuel
                            </p>
                            <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-400">avant impôt</span>
                        </div>
                        <WaterfallChart rent={expectedRent} charges={monthlyCharges} loan={monthlyPayment} balance={monthlyBalance}/>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-600 flex items-center gap-1.5">
                                <Landmark size={11}/> Régime Fiscal
                            </p>
                            {taxSavingsLmnp > 0 && (
                                <span className="text-[9px] uppercase tracking-widest font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Sparkles size={9}/> Économie LMNP : {formatPrice(Math.round(taxSavingsLmnp))} €/an
                                </span>
                            )}
                        </div>

                        <div className="relative grid grid-cols-2 p-1 bg-zinc-100 rounded-2xl border border-zinc-200">
                            <div
                                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl shadow-md transition-all duration-300 ease-out"
                                style={{
                                    left: rentalRegime === "nu" ? "4px" : "50%",
                                    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                                }}
                            />
                            <button
                                onClick={() => setRentalRegime("nu")}
                                className={`relative z-10 py-2.5 text-[11px] font-black uppercase tracking-widest transition-colors duration-300 ${
                                    rentalRegime === "nu" ? "text-white" : "text-zinc-600"
                                }`}
                            >
                                Location Nue
                            </button>
                            <button
                                onClick={() => setRentalRegime("lmnp")}
                                className={`relative z-10 py-2.5 text-[11px] font-black uppercase tracking-widest transition-colors duration-300 flex items-center justify-center gap-1.5 ${
                                    rentalRegime === "lmnp" ? "text-white" : "text-zinc-600"
                                }`}
                            >
                                <BadgePercent size={12}/> LMNP
                            </button>
                        </div>

                        <div className="mt-3 p-3 rounded-xl bg-white border border-zinc-200/70 space-y-1.5">
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-zinc-500 font-semibold">
                                    {rentalRegime === "lmnp" ? "Abattement micro-BIC" : "Abattement micro-foncier"}
                                </span>
                                <span className="font-black font-mono text-zinc-800">
                                    {rentalRegime === "lmnp" ? "−50%" : "−30%"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-zinc-500 font-semibold">Base imposable annuelle</span>
                                <span className="font-black font-mono text-zinc-800">
                                    {formatPrice(Math.round(rentalRegime === "lmnp" ? lmnpTaxableIncome : nuTaxableIncome))} €
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-zinc-500 font-semibold">
                                    Impôts + PS ({Math.round((DEFAULT_TMI + SOCIAL_CHARGES) * 100)}%)
                                </span>
                                <span className="font-black font-mono" style={{ color: COLORS.primary }}>
                                    −{formatPrice(Math.round(currentTax))} €/an
                                </span>
                            </div>
                        </div>
                        <p className="text-[8px] text-zinc-400 mt-2 italic leading-snug">
                            Hypothèses : TMI 30% + prélèvements sociaux 17,2%. Simulation indicative.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl text-center border" style={{ background: `linear-gradient(135deg, ${COLORS.primary}08, ${COLORS.secondary}12)`, borderColor: `${COLORS.secondary}30` }}>
                            <p className="text-[9px] uppercase font-bold mb-2 tracking-widest" style={{ color: COLORS.primary }}>
                                Renta Nette-Nette
                            </p>
                            <p className="text-2xl font-black font-mono" style={{ color: COLORS.primary }}>
                                {netNetYield.toFixed(2)}
                                <span className="text-sm opacity-70"> %</span>
                            </p>
                            <p className="text-[9px] text-zinc-500 mt-1 font-semibold">
                                Brute : {grossYield.toFixed(2)}% · Nette : {netYield.toFixed(2)}%
                            </p>
                        </div>
                        <div className={`p-4 rounded-2xl border text-center ${
                            monthlyBalanceAfterTax >= 0
                                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200'
                                : 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200'
                        }`}>
                            <p className={`text-[9px] uppercase font-bold mb-2 tracking-widest ${monthlyBalanceAfterTax >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {monthlyBalanceAfterTax >= 0 ? "Cash-Flow net" : "Effort Épargne"}
                            </p>
                            <p className={`text-2xl font-black tracking-tighter font-mono ${monthlyBalanceAfterTax >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {monthlyBalanceAfterTax >= 0 ? '+' : ''}{formatPrice(Math.round(monthlyBalanceAfterTax))}
                                <span className="text-xs font-medium opacity-70"> €/m</span>
                            </p>
                            <p className="text-[9px] text-zinc-500 mt-1 font-semibold">après impôt</p>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );

    return (
        <div className="min-h-screen bg-[#faf8f6] text-zinc-900 font-sans pb-20 selection:bg-[#d35f52]/30 relative overflow-x-hidden">
            {/* Halos décoratifs d'ambiance */}
            <div className="pointer-events-none fixed top-0 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20" style={{ background: `radial-gradient(circle, ${COLORS.secondary} 0%, transparent 70%)` }}/>
            <div className="pointer-events-none fixed top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15" style={{ background: `radial-gradient(circle, ${COLORS.primary} 0%, transparent 70%)` }}/>

            {/* ============================================================
                HERO MOBILE / TABLETTE (< lg / 1024px)
                ============================================================ */}
            <div className="lg:hidden">
                <div className="relative w-full h-[42vh] min-h-[320px] overflow-hidden">
                    <img src={data.mainPhoto} className="w-full h-full object-cover" alt="Bien" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.75) 100%)` }} />
                    <div className="absolute inset-0 mix-blend-overlay opacity-25" style={{ background: `linear-gradient(135deg, ${COLORS.primary}00 0%, ${COLORS.primary}50 100%)` }} />

                    <Link
                        href="/mes-biens"
                        className="absolute top-5 left-5 flex items-center gap-2.5 bg-white/90 backdrop-blur-xl p-2.5 pr-4 rounded-2xl border border-white/60 shadow-xl hover:bg-white transition-colors group"
                        title="Retour à Mes biens"
                    >
                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
                            <ArrowLeft size={12} className="text-zinc-600"/>
                        </div>
                        <img src="/logo-patrim.png" className="h-7 object-contain" alt="Patrim"/>
                        <div className="h-5 w-px bg-zinc-300"/>
                        <div className="flex flex-col">
                            <span className="text-[8px] uppercase tracking-[0.25em] font-bold text-zinc-500 leading-none">Patrim</span>
                            <span className="text-[9px] uppercase tracking-widest font-black leading-tight" style={{ color: COLORS.primary }}>Simulation</span>
                        </div>
                    </Link>

                    <div className="absolute top-5 right-5 flex items-center gap-1.5 bg-white/90 backdrop-blur-xl px-3 py-2 rounded-full border border-white/60 shadow-lg">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: COLORS.secondary }}/>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: COLORS.primary }}/>
                        </span>
                        <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-700">Live</span>
                    </div>

                    <div className="absolute bottom-5 left-5 right-5 text-white">
                        <p className="text-[9px] uppercase tracking-[0.25em] font-black mb-1.5 flex items-center gap-2" style={{ color: COLORS.secondary, textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>
                            <TrendingUp size={12}/> Simulateur Financier
                        </p>
                        <h1 className="font-serif text-3xl font-bold leading-tight" style={{ textShadow: '0 4px 16px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.5)' }}>
                            {data.propertyType} {data.rooms > 0 && `T${data.rooms}`}
                        </h1>
                    </div>
                </div>

                {/* Cartouche prix en flux normal (plus d'overlap) */}
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
                                {formatPrice(referencePrice)}
                                <span className="ml-2 text-2xl font-black align-top" style={{ color: COLORS.primary }}>€</span>
                            </p>
                        </div>
                    </div>

                    {/* Mini-preview galerie — Version MOBILE */}
                    {photoCount > 0 && (
                        <GalleryPreview
                            galleryId={estimationId}
                            mainPhoto={data.mainPhoto}
                            photoCount={photoCount}
                        />
                    )}
                </div>
            </div>

            {/* ============================================================
                HERO DESKTOP (≥ lg / 1024px) — SANS OVERLAP
                Layout : photo plein écran + infos intégrées dans la photo,
                pas de cartouche flottant qui déborde.
                ============================================================ */}
            <div className="hidden lg:block relative w-full h-[50vh] min-h-[420px] max-h-[560px] overflow-hidden">
                <img src={data.mainPhoto} className="w-full h-full object-cover" alt="Bien" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.85) 100%)` }} />
                <div className="absolute inset-0 mix-blend-overlay opacity-30" style={{ background: `linear-gradient(135deg, ${COLORS.primary}00 0%, ${COLORS.primary}60 100%)` }} />

                {/* Badge logo Patrim — cliquable, ramène à Mes biens */}
                <Link
                    href="/mes-biens"
                    className="absolute top-8 left-8 flex items-center gap-3 bg-white/90 backdrop-blur-xl p-3 pr-5 rounded-2xl border border-white/60 shadow-xl hover:bg-white transition-colors group"
                    title="Retour à Mes biens"
                >
                    <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
                        <ArrowLeft size={14} className="text-zinc-600"/>
                    </div>
                    <img src="/logo-patrim.png" className="h-8 object-contain" alt="Patrim"/>
                    <div className="h-6 w-px bg-zinc-300"/>
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-zinc-500 leading-none">Patrim</span>
                        <span className="text-[10px] uppercase tracking-widest font-black leading-tight" style={{ color: COLORS.primary }}>Simulation</span>
                    </div>
                </Link>

                {/* Badge live */}
                <div className="absolute top-8 right-8 flex items-center gap-2 bg-white/90 backdrop-blur-xl px-4 py-2.5 rounded-full border border-white/60 shadow-lg">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: COLORS.secondary }}/>
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: COLORS.primary }}/>
                    </span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-700">Simulation Live</span>
                </div>

                {/* Zone inférieure : titre à gauche + prix à droite, bien alignés */}
                <div className="absolute bottom-10 left-10 right-10 flex items-end justify-between gap-10 max-w-[1600px] mx-auto">
                    <div className="text-white flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-[0.3em] font-black mb-3 flex items-center gap-2" style={{ color: COLORS.secondary, textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>
                            <TrendingUp size={14}/> Simulateur Financier 
                        </p>
                        <h1 className="font-serif text-5xl xl:text-6xl font-bold leading-tight" style={{ textShadow: '0 4px 16px rgba(0,0,0,0.7)' }}>
                            {data.propertyType} {data.rooms > 0 && `T${data.rooms}`}
                        </h1>
                    </div>

                    {/* Cartouche prix — intégré dans le hero, plus de translate-y qui déborde */}
                    <div className="flex-shrink-0 flex flex-col gap-3 items-end">
                        <div className="bg-white/95 backdrop-blur-2xl rounded-2xl border border-white shadow-[0_20px_60px_-10px_rgba(138,14,1,0.5)] overflow-hidden">
                            <div className="px-6 pt-2.5 pb-2 flex items-center justify-between gap-6" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/95">
                                    Prix de Présentation
                                </span>
                                <span className="text-[9px] uppercase tracking-widest font-bold text-white/70">FAI</span>
                            </div>
                            <div className="px-6 py-4 bg-white">
                                <p className="font-black tracking-tighter leading-none text-zinc-900 text-5xl xl:text-6xl whitespace-nowrap">
                                    {formatPrice(referencePrice)}
                                    <span className="ml-2 text-3xl font-black align-top" style={{ color: COLORS.primary }}>€</span>
                                </p>
                            </div>
                        </div>

                        {/* Mini-preview galerie — Version DESKTOP (sous le cartouche prix) */}
                        {photoCount > 0 && (
                            <GalleryPreview
                                galleryId={estimationId}
                                mainPhoto={data.mainPhoto}
                                photoCount={photoCount}
                                variant="desktop"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================================
                BANDEAU TICKER — visible uniquement en desktop, juste sous le hero
                Résumé live : Offre / Mensualité / Endettement / Cash-Flow
                ============================================================ */}
            <div className="hidden lg:block relative z-20 -mt-px bg-white/80 backdrop-blur-xl border-y border-zinc-200/70 shadow-sm">
                <div className="max-w-[1600px] mx-auto px-10 py-4 grid grid-cols-4 gap-6">
                    <TickerStat
                        label="Votre Offre"
                        value={`${formatPrice(Math.round(price))} €`}
                        sublabel={offerDelta !== 0 ? `${offerDelta < 0 ? '−' : '+'}${formatPrice(Math.abs(Math.round(offerDelta)))} € vs prix affiché` : 'Au prix affiché'}
                        sublabelColor={offerDelta < 0 ? 'text-emerald-700' : offerDelta > 0 ? 'text-amber-700' : 'text-zinc-400'}
                    />
                    <TickerStat
                        label="Mensualité"
                        value={monthlyPayment > 0 ? `${formatPrice(Math.round(monthlyPayment))} €` : "—"}
                        sublabel={`sur ${safeDuration} ans à ${interestRate}%`}
                        highlight
                    />
                    <TickerStat
                        label="Endettement"
                        value={monthlyIncome > 0 ? `${debtRatio.toFixed(1)}%` : "—"}
                        sublabel={monthlyIncome > 0 ? (debtRatio > 35 ? '⚠ Au-dessus du seuil HCSF' : '✓ Sous le seuil HCSF') : 'Renseignez vos revenus'}
                        sublabelColor={monthlyIncome > 0 ? (debtRatio > 35 ? 'text-rose-700' : 'text-emerald-700') : 'text-zinc-400'}
                    />
                    <TickerStat
                        label={isRental ? (monthlyBalanceAfterTax >= 0 ? "Cash-Flow net" : "Effort épargne") : "Projet Total"}
                        value={
                            isRental
                                ? `${monthlyBalanceAfterTax >= 0 ? '+' : ''}${formatPrice(Math.round(monthlyBalanceAfterTax))} €/m`
                                : `${formatPrice(Math.round(totalProject))} €`
                        }
                        sublabel={isRental ? `Renta net-net : ${netNetYield.toFixed(2)}%` : 'Bien + notaire + travaux'}
                        sublabelColor={isRental ? (monthlyBalanceAfterTax >= 0 ? 'text-emerald-700' : 'text-rose-700') : 'text-zinc-400'}
                    />
                </div>
            </div>

            {/* ============================================================
                LAYOUT MOBILE / TABLETTE — Une colonne (< lg)
                ============================================================ */}
            <div className="lg:hidden px-5 mt-6 relative z-10 space-y-5 max-w-2xl mx-auto">
                {ProjectCard}
                {BankCard}
                {ChartCard}
                {RentalCard}
            </div>

            {/* ============================================================
                LAYOUT DESKTOP — Dashboard 2 colonnes (≥ lg)
                ▸ Colonne gauche (5 cols) : inputs — scroll normal
                ▸ Colonne droite (7 cols) : outputs visuels — STICKY
                ============================================================ */}
            <div className="hidden lg:block max-w-[1600px] mx-auto px-10 mt-8 relative z-10">
                <div className="grid grid-cols-12 gap-6 items-start">

                    {/* COLONNE GAUCHE — Inputs (scroll normal) */}
                    <div className="col-span-12 xl:col-span-5 space-y-5">
                        {ProjectCard}
                        {BankCard}
                        {RentalCard}
                    </div>

                    {/* COLONNE DROITE — Outputs visuels (STICKY) */}
                    <div className="col-span-12 xl:col-span-7">
                        <div className="sticky top-6 space-y-5 max-h-[calc(100vh-3rem)] overflow-y-auto pr-2 custom-scrollbar">
                            {ChartCard || (
                                <div className="bg-white/60 backdrop-blur-xl p-10 rounded-[32px] border border-white text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.secondary}20)` }}>
                                        <TrendingUp size={28} style={{ color: COLORS.primary }}/>
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-widest mb-2 text-zinc-600">Votre Simulation</p>
                                    <p className="text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto">
                                        Renseignez votre offre, vos revenus et votre apport pour faire apparaître votre plan de remboursement personnalisé.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* FOOTER */}
            <div className="text-center mt-12 pb-10 relative z-10">
                <div className="inline-flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80">
                    <img src="/logo-patrim.png" className="h-6 object-contain opacity-80" alt="Patrim"/>
                    <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-zinc-500">
                        Outil d'aide à la décision · Non contractuel
                    </p>
                </div>
            </div>

            {/* Style pour la scrollbar sticky du desktop */}
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${COLORS.secondary}30;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${COLORS.secondary}60;
                }
            `}}/>
        </div>
    );
}

/* ============================================================
   COMPOSANT CARD — Enveloppe standard d'une carte
   Utilisé partout pour garantir la cohérence visuelle entre
   les 2 layouts (mobile 1-col / desktop 2-cols).
   ============================================================ */
function Card({
    children, title, icon, step, headerRight, titleColor,
}: {
    children?: ReactNode;
    title: string;
    icon: ReactNode;
    step?: string;
    headerRight?: ReactNode;
    titleColor?: string;
}) {
    return (
        <div className="bg-white/80 backdrop-blur-2xl p-7 rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(138,14,1,0.15)] space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2" style={{ color: titleColor || '#27272a' }}>
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                        {icon}
                    </span>
                    {title}
                </h2>
                {/* Zone droite du header — un seul rendu, pas de doublon */}
                {(step || headerRight) && (
                    <div className="flex items-center gap-3">
                        {step && <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400">{step}</span>}
                        {headerRight}
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}

/* ============================================================
   COMPOSANT TICKER STAT — Chiffre clé du bandeau desktop
   ============================================================ */
function TickerStat({
    label, value, sublabel, sublabelColor = "text-zinc-400", highlight = false,
}: {
    label: string;
    value: string;
    sublabel?: string;
    sublabelColor?: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-zinc-500 mb-1">{label}</span>
            <span
                className="text-2xl font-black tracking-tight font-mono leading-none"
                style={highlight ? { color: COLORS.primary } : { color: '#18181b' }}
            >
                {value}
            </span>
            {sublabel && (
                <span className={`text-[10px] font-semibold mt-1 ${sublabelColor}`}>{sublabel}</span>
            )}
        </div>
    );
}

/* ============================================================
   COMPOSANT WATERFALL — Bilan Locatif en cascade
   ============================================================ */
function WaterfallChart({
    rent, charges, loan, balance,
}: { rent: number; charges: number; loan: number; balance: number }) {

    const scale = Math.max(rent, charges + loan + Math.abs(Math.min(0, balance)), 1);

    const bars = [
        {
            label: "Loyer perçu",
            value: rent,
            type: "positive" as const,
            icon: <Coins size={12}/>,
            color: COLORS.wealth,
            colorLight: COLORS.wealthLight,
        },
        {
            label: "Charges & Taxes",
            value: -charges,
            type: "negative" as const,
            icon: <Receipt size={12}/>,
            color: "#9ca3af",
            colorLight: "#6b7280",
        },
        {
            label: "Mensualité prêt",
            value: -loan,
            type: "negative" as const,
            icon: <Landmark size={12}/>,
            color: COLORS.primary,
            colorLight: COLORS.secondary,
        },
        {
            label: balance >= 0 ? "Cash-Flow" : "Effort d'épargne",
            value: balance,
            type: "result" as const,
            icon: balance >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>,
            color: balance >= 0 ? COLORS.wealth : COLORS.primary,
            colorLight: balance >= 0 ? COLORS.wealthLight : COLORS.secondary,
        },
    ];

    return (
        <div className="space-y-2.5">
            {bars.map((bar, i) => {
                const widthPct = Math.min(100, (Math.abs(bar.value) / scale) * 100);
                const isResult = bar.type === "result";
                return (
                    <div key={i} className={isResult ? "pt-2 mt-1 border-t border-dashed border-zinc-300" : ""}>
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5 ${
                                isResult ? "text-zinc-900" : "text-zinc-600"
                            }`}>
                                <span style={{ color: bar.color }}>{bar.icon}</span>
                                {bar.label}
                            </span>
                            <span className={`font-mono font-black text-sm ${
                                bar.type === "positive" ? "text-emerald-700" :
                                bar.type === "negative" ? "text-zinc-700" :
                                bar.value >= 0 ? "text-emerald-700" : "text-rose-700"
                            }`}>
                                {bar.value > 0 ? "+" : bar.value < 0 ? "−" : ""}{formatPrice(Math.round(Math.abs(bar.value)))}
                                <span className="text-[9px] opacity-60 font-medium"> €</span>
                            </span>
                        </div>
                        <div className="relative h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                                className={`absolute inset-y-0 rounded-full transition-all duration-500 ease-out ${
                                    bar.type === "negative" ? "right-0" : "left-0"
                                }`}
                                style={{
                                    width: `${widthPct}%`,
                                    background: `linear-gradient(90deg, ${bar.color}, ${bar.colorLight})`,
                                    opacity: bar.type === "negative" ? 0.75 : 1,
                                }}
                            />
                            {isResult && (
                                <div
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{
                                        width: `${widthPct}%`,
                                        background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ============================================================
   COMPOSANT GALLERY PREVIEW — Lien vers la galerie photo
   Petite bande avec photo miniature + compteur + flèche.
   Deux variantes : mobile (plus compact) / desktop (aligné
   sur la largeur du cartouche prix).
   ============================================================ */
function GalleryPreview({
    galleryId, mainPhoto, photoCount, variant = "mobile",
}: {
    galleryId: string;
    mainPhoto: string;
    photoCount: number;
    variant?: "mobile" | "desktop";
}) {
    return (
        <Link
            href={`/galerie/${galleryId}`}
            className={`group block mt-3 ${variant === "desktop" ? "w-full" : ""}`}
        >
            <div className="flex items-center gap-3 p-2 pr-4 bg-white/90 backdrop-blur-xl rounded-2xl border border-white shadow-[0_10px_30px_-8px_rgba(138,14,1,0.25)] hover:shadow-[0_15px_40px_-8px_rgba(138,14,1,0.4)] transition-all duration-300 hover:-translate-y-0.5">
                {/* Miniature photo avec zoom au hover */}
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                    <img
                        src={mainPhoto}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        alt="Aperçu"
                    />
                    {/* Overlay icône caméra au hover */}
                    <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: `${COLORS.primary}50` }}
                    >
                        <Camera size={18} className="text-white"/>
                    </div>
                </div>

                {/* Texte */}
                <div className="flex-1 min-w-0">
                    <p
                        className="text-[8px] uppercase tracking-[0.25em] font-black leading-none"
                        style={{ color: COLORS.primary }}
                    >
                        Galerie Photo
                    </p>
                    <p className="text-xs font-black text-zinc-800 mt-1 leading-tight">
                        Voir les {photoCount} {photoCount > 1 ? "photos" : "photo"} du bien
                    </p>
                </div>

                {/* Flèche qui glisse au hover */}
                <ArrowRight
                    size={14}
                    style={{ color: COLORS.primary }}
                    className="flex-shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                />
            </div>
        </Link>
    );
}