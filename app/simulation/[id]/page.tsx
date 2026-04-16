"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber as formatPrice } from "@/lib/formatters";
import { Calculator, Wallet, TrendingUp, AlertCircle, Percent, Clock, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const COLORS = {
    primary: "#8a0e01",   // ROUGE
    secondary: "#d35f52", // ROSE
    gray: "#393939",      // GRIS
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
    const [loanDuration, setLoanDuration] = useState<number>(20);
    const [interestRate, setInterestRate] = useState<number>(3.5);

    // --- OPTION LOCATIVE ---
    const [isRental, setIsRental] = useState<boolean>(false);
    const [expectedRent, setExpectedRent] = useState<number>(0);

    // --- GRAPHIQUE INTERACTIF (Scrubbing) ---
    const [selectedYear, setSelectedYear] = useState<number>(1);
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
    const notaryFees = price * 0.08; 
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
    const generateAmortization = () => {
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
    };

    const amortizationSchedule = generateAmortization();
    const currentYearData = amortizationSchedule[selectedYear] || amortizationSchedule[0];
    const totalInterestPaid = amortizationSchedule[amortizationSchedule.length - 1]?.cumulativeInterest || 0;

    // --- INTERACTION GRAPHIQUE (Le Scrubbing FinTech) ---
    const handleChartInteraction = (clientX: number) => {
        if (!chartContainerRef.current) return;
        const rect = chartContainerRef.current.getBoundingClientRect();
        let x = clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width)); // Clamp entre 0 et width
        const percentage = x / rect.width;
        let year = Math.round(percentage * safeDuration);
        year = Math.max(1, Math.min(year, safeDuration));
        setSelectedYear(year);
    };

    const handleTouchMove = (e: React.TouchEvent) => handleChartInteraction(e.touches[0].clientX);
    const handleMouseMove = (e: React.MouseEvent) => handleChartInteraction(e.clientX);

    // --- CONSTRUCTION DU SVG ---
    const svgWidth = 1000;
    const svgHeight = 250;
    let balancePath = `M 0 ${svgHeight}`;
    let interestPath = `M 0 ${svgHeight}`;
    
    if (loanAmount > 0) {
        amortizationSchedule.forEach((d, i) => {
            const x = (i / safeDuration) * svgWidth;
            const yBalance = svgHeight - ((d.balance / loanAmount) * svgHeight);
            balancePath += ` L ${x} ${yBalance}`;
            const maxScale = Math.max(loanAmount, totalInterestPaid);
            const yInterest = svgHeight - ((d.cumulativeInterest / maxScale) * svgHeight);
            interestPath += ` L ${x} ${yInterest}`;
        });
    }

    if (loading) return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white font-sans">Chargement...</div>;
    if (!data) return <div className="min-h-screen bg-[#0a0a0c] text-white p-10 font-sans">Bien introuvable.</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white font-sans pb-20 selection:bg-[#d35f52]/30">
            {/* HERO MOBILE XXL (FinTech Premium) */}
            <div className="relative h-[40vh] min-h-[350px] w-full">
                <img src={data.mainPhoto} className="w-full h-full object-cover" alt="Bien"/>
                {/* Gradient plus sombre pour faire ressortir le texte blanc */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/60 to-transparent"></div>
                
                <div className="absolute top-6 left-6 flex items-center justify-center bg-black/30 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                    <img src="/logo-patrim.png" className="h-8 object-contain"/>
                </div>
                
                <div className="absolute bottom-8 left-6 right-6">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-bold mb-2 flex items-center gap-2">
                        <TrendingUp size={14} className="text-[#d35f52]"/> Simulateur Financier
                    </p>
                    <h1 className="text-3xl font-serif font-bold mb-1 leading-tight">{data.propertyType} {data.rooms > 0 && `T${data.rooms}`}</h1>
                    <p className="text-5xl font-black text-white drop-shadow-md">
                        {formatPrice(price)} <span className="text-2xl text-zinc-400 font-bold">€</span>
                    </p>
                </div>
            </div>

            <div className="px-5 -mt-4 relative z-10 space-y-6 max-w-2xl mx-auto">
                
                {/* 1. DONNÉES DU PROJET */}
                <div className="bg-[#111114] p-6 rounded-[28px] border border-white/5 shadow-2xl space-y-6">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2"><Wallet size={16}/> Votre Projet</h2>
                    
                    <div>
                        <label className="text-xs text-zinc-500 mb-2 block font-medium">Revenus nets mensuels (€)</label>
                        <Input type="number" value={monthlyIncome||""} onChange={e=>setMonthlyIncome(Number(e.target.value))} className="bg-black border-white/10 h-14 text-xl text-white font-bold focus:border-[#d35f52] rounded-2xl" placeholder="Ex: 4500"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Apport Personnel</label>
                            <Input type="number" value={downPayment||""} onChange={e=>setDownPayment(Number(e.target.value))} className="bg-black border-white/10 h-12 text-base text-white font-bold focus:border-[#d35f52] rounded-xl" placeholder="Ex: 20000"/>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Budget Travaux</label>
                            <Input type="number" value={worksBudget||""} onChange={e=>setWorksBudget(Number(e.target.value))} className="bg-black border-white/10 h-12 text-base text-white font-bold focus:border-[#d35f52] rounded-xl" placeholder="Optionnel"/>
                        </div>
                    </div>
                </div>

                {/* 2. PARAMÈTRES CRÉDIT */}
                <div className="bg-[#111114] p-6 rounded-[28px] border border-white/5 shadow-2xl space-y-6">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-white/70 flex items-center gap-2"><Clock size={16}/> Hypothèse Bancaire</h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 flex items-center gap-1.5"><Clock size={12}/> Durée (Années)</label>
                            <Input type="number" value={loanDuration||""} onChange={e=>setLoanDuration(Number(e.target.value))} className="bg-black border-white/10 h-12 text-lg text-white focus:border-[#d35f52] text-center font-black rounded-xl"/>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 flex items-center gap-1.5"><Percent size={12}/> Taux d'intérêt</label>
                            <Input type="number" step="0.1" value={interestRate||""} onChange={e=>setInterestRate(Number(e.target.value))} className="bg-black border-white/10 h-12 text-lg text-[#d35f52] focus:border-[#d35f52] text-center font-black rounded-xl"/>
                        </div>
                    </div>

                    <div className="pt-5 border-t border-white/5 flex justify-between items-end">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Mensualité Prêt</p>
                            <p className="text-4xl font-black text-white tracking-tighter">{formatPrice(Math.round(monthlyPayment))} <span className="text-sm text-zinc-500 font-medium">€/m</span></p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Endettement</p>
                            <div className={`px-3 py-1.5 rounded-lg text-base font-black inline-block ${debtRatio > 35 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {monthlyIncome > 0 ? debtRatio.toFixed(1) + "%" : "-"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. GRAPHIQUE D'AMORTISSEMENT RÉEL (Interactif Finary Style) */}
                {loanAmount > 0 && (
                    <div className="bg-[#111114] p-6 rounded-[28px] border border-white/5 shadow-2xl">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-[#d35f52] flex items-center gap-2 mb-6"><TrendingUp size={16}/> Amortissement</h2>
                        
                        {/* Afficheur en temps réel piloté par le graphique */}
                        <div className="mb-6 bg-black p-5 rounded-2xl border border-white/5 shadow-inner">
                            <p className="text-[11px] uppercase tracking-widest font-bold text-zinc-400 mb-4 flex items-center gap-2">
                                <Clock size={14}/> À la fin de l'année <span className="text-white text-base bg-[#393939] px-2.5 py-1 rounded-md">{selectedYear}</span>
                            </p>
                            <div className="flex justify-between items-end border-b border-white/5 pb-4 mb-4">
                                <div><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Capital Restant Dû</p><p className="text-2xl font-black text-white">{formatPrice(Math.round(currentYearData.balance))} €</p></div>
                                <div className="text-right"><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Capital Amorti</p><p className="text-xl font-bold text-emerald-500">+{formatPrice(Math.round(currentYearData.cumulativePrincipal))} €</p></div>
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 flex items-center justify-between">
                                    <span>Coût des intérêts (cumulé)</span>
                                    <span className="text-[#d35f52] font-black text-base">{formatPrice(Math.round(currentYearData.cumulativeInterest))} €</span>
                                </p>
                            </div>
                        </div>

                        {/* LE GRAPHIQUE INTERACTIF (Scrubbing) */}
                        <div 
                            className="relative w-full h-48 border-b border-l border-white/20 mb-2 cursor-crosshair touch-none"
                            ref={chartContainerRef}
                            onTouchMove={handleTouchMove}
                            onMouseMove={handleMouseMove}
                            onClick={(e) => handleChartInteraction(e.clientX)} // Permet de cliquer directement sur une année
                        >
                            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                {/* Zone Capital Restant */}
                                <path d={`${balancePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`} fill="#393939" opacity="0.3" />
                                <path d={balancePath} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                
                                {/* Zone Intérêts Payés */}
                                <path d={`${interestPath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`} fill="#8a0e01" opacity="0.4" />
                                <path d={interestPath} fill="none" stroke="#d35f52" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                                {/* Ligne Verticale Interactive qui suit le doigt */}
                                <line 
                                    x1={(selectedYear / safeDuration) * svgWidth} y1="0" 
                                    x2={(selectedYear / safeDuration) * svgWidth} y2={svgHeight} 
                                    stroke="white" strokeWidth="2" strokeDasharray="5 5" opacity="0.7"
                                />
                                {/* Point sur la courbe du capital */}
                                <circle cx={(selectedYear / safeDuration) * svgWidth} cy={svgHeight - ((currentYearData.balance / loanAmount) * svgHeight)} r="12" fill="white" className="shadow-lg"/>
                            </svg>
                        </div>
                        <p className="text-center text-[9px] text-zinc-500 uppercase tracking-widest font-bold mt-3 mb-6">
                            Glissez le doigt sur le graphique pour avancer dans le temps
                        </p>

                        <div className="flex justify-center gap-6 text-[10px] text-zinc-400 font-bold uppercase">
                            <span className="flex items-center gap-2"><div className="w-3 h-3 bg-white rounded-sm"></div> Capital Restant</span>
                            <span className="flex items-center gap-2"><div className="w-3 h-3 bg-[#d35f52] rounded-sm"></div> Intérêts Payés</span>
                        </div>
                    </div>
                )}

                {/* 4. OPTION LOCATIVE */}
                <div className="bg-[#111114] p-6 rounded-[28px] border border-white/5 shadow-xl space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-[#c9a84c] flex items-center gap-2"><Key size={16}/> Projet Locatif</h2>
                        <Switch checked={isRental} onCheckedChange={setIsRental} />
                    </div>

                    {isRental && (
                        <div className="pt-4 border-t border-white/5 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
                            <div>
                                <label className="text-[11px] uppercase font-bold text-zinc-400 mb-2 block">Loyer Mensuel Estimé (€ HC)</label>
                                <Input type="number" value={expectedRent||""} onChange={e=>setExpectedRent(Number(e.target.value))} className="bg-black border-white/10 h-14 text-2xl text-[#c9a84c] font-black focus:border-[#c9a84c] rounded-xl text-center" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black p-4 rounded-2xl border border-white/5 text-center">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Renta Nette</p>
                                    <p className="text-2xl font-black text-[#c9a84c]">{netYield.toFixed(2)} <span className="text-sm">%</span></p>
                                </div>
                                <div className={`p-4 rounded-2xl border text-center ${monthlyBalance >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                                    <p className={`text-[10px] uppercase font-bold mb-2 ${monthlyBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {monthlyBalance >= 0 ? "Cash-Flow" : "Effort Épargne"}
                                    </p>
                                    <p className={`text-2xl font-black tracking-tighter ${monthlyBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {monthlyBalance >= 0 ? '+' : ''}{formatPrice(Math.round(monthlyBalance))} <span className="text-xs font-medium opacity-70">€/m</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
            
            <div className="text-center mt-10 opacity-50 pb-10">
                <img src="/logo-patrim.png" className="h-5 mx-auto mb-2 grayscale"/>
                <p className="text-[9px] uppercase tracking-widest font-bold">Outil d'aide à la décision non contractuel</p>
            </div>
        </div>
    );
}