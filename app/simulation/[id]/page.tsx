"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber as formatPrice } from "@/lib/formatters";
import { Calculator, Wallet, TrendingUp, AlertCircle, Percent, Clock, Key, PiggyBank } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

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

    // --- GRAPHIQUE INTERACTIF ---
    const [selectedYear, setSelectedYear] = useState<number>(1);

    useEffect(() => {
        if (!estimationId) return;
        const fetchData = async () => {
            const { data: estim } = await supabase.from('estimations').select('data_json').eq('id', estimationId).single();
            if (estim && estim.data_json) {
                setData(estim.data_json);
                setExpectedRent(estim.data_json.monthlyRent || 0); // Pré-remplit avec l'estimation
            }
            setLoading(false);
        };
        fetchData();
    }, [estimationId]);

    // --- CALCULS DU PRÊT ---
    const price = initialPrice > 0 ? initialPrice : (data?.highPrice || 0);
    const notaryFees = price * 0.08; // Frais de notaire estimés à 8%
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
    
    // --- CALCULS LOCATIFS ---
    const monthlyCharges = (data?.coproFees || 0) + ((data?.taxeFonciere || 0) / 12);
    const monthlyBalance = expectedRent - monthlyPayment - monthlyCharges;
    const netYield = totalProject > 0 ? (((expectedRent * 12) - (monthlyCharges * 12)) / totalProject) * 100 : 0;

    // --- GÉNÉRATION DU TABLEAU D'AMORTISSEMENT RÉEL ---
    const generateAmortization = () => {
        let schedule = [];
        let balance = loanAmount;
        let cumulativeInterest = 0;
        let cumulativePrincipal = 0;

        // Année 0 (Départ)
        schedule.push({ year: 0, balance, cumulativeInterest, cumulativePrincipal });

        for (let y = 1; y <= safeDuration; y++) {
            let interestYear = 0;
            let principalYear = 0;
            for (let m = 1; m <= 12; m++) {
                const interestMonth = balance * monthlyRate;
                const principalMonth = monthlyPayment - interestMonth;
                balance -= principalMonth;
                interestYear += interestMonth;
                principalYear += principalMonth;
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
    
    // Sécurité pour le slider
    useEffect(() => {
        if (selectedYear > safeDuration) setSelectedYear(safeDuration);
        if (selectedYear < 1) setSelectedYear(1);
    }, [safeDuration, selectedYear]);

    const currentYearData = amortizationSchedule[selectedYear] || amortizationSchedule[0];
    const totalInterestPaid = amortizationSchedule[amortizationSchedule.length - 1]?.cumulativeInterest || 0;

    // --- CONSTRUCTION DU SVG INTERACTIF ---
    const svgWidth = 1000;
    const svgHeight = 250;
    let balancePath = `M 0 ${svgHeight}`;
    let interestPath = `M 0 ${svgHeight}`;
    
    if (loanAmount > 0) {
        amortizationSchedule.forEach((d, i) => {
            const x = (i / safeDuration) * svgWidth;
            // Courbe du capital restant dû (Descendante)
            const yBalance = svgHeight - ((d.balance / loanAmount) * svgHeight);
            balancePath += ` L ${x} ${yBalance}`;
            // Courbe des intérêts cumulés (Montante, on la scale par rapport au coût total)
            const maxScale = Math.max(loanAmount, totalInterestPaid);
            const yInterest = svgHeight - ((d.cumulativeInterest / maxScale) * svgHeight);
            interestPath += ` L ${x} ${yInterest}`;
        });
    }

    if (loading) return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white font-sans">Chargement...</div>;
    if (!data) return <div className="min-h-screen bg-[#0a0a0c] text-white p-10 font-sans">Bien introuvable.</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white font-sans pb-20">
            {/* HERO MOBILE */}
            <div className="relative h-64 w-full">
                <img src={data.mainPhoto} className="w-full h-full object-cover" alt="Bien"/>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-black/40 to-transparent"></div>
                <div className="absolute top-6 left-6 flex items-center justify-center bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/5"><img src="/logo-patrim.png" className="h-8 object-contain"/></div>
                <div className="absolute bottom-6 left-6 right-6">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Simulateur d'acquisition</p>
                    <h1 className="text-2xl font-serif font-bold mb-1">{data.propertyType} {data.rooms > 0 && `T${data.rooms}`}</h1>
                    <p className="text-xl font-black text-[#d35f52]">{formatPrice(price)} € <span className="text-sm text-zinc-500 font-normal">FAI</span></p>
                </div>
            </div>

            <div className="px-6 -mt-2 relative z-10 space-y-6">
                
                {/* 1. DONNÉES DU PROJET */}
                <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl space-y-5">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2"><Wallet size={16}/> Votre Projet</h2>
                    
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Revenus nets mensuels (€)</label>
                        <Input type="number" value={monthlyIncome||""} onChange={e=>setMonthlyIncome(Number(e.target.value))} className="bg-black border-white/10 h-14 text-lg text-white focus:border-[#d35f52]" placeholder="Ex: 4500"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] uppercase font-bold text-zinc-500 mb-1 block">Apport Personnel</label>
                            <Input type="number" value={downPayment||""} onChange={e=>setDownPayment(Number(e.target.value))} className="bg-black border-white/10 h-12 text-base text-white focus:border-[#d35f52]" placeholder="Ex: 20000"/>
                        </div>
                        <div>
                            <label className="text-[11px] uppercase font-bold text-zinc-500 mb-1 block">Budget Travaux</label>
                            <Input type="number" value={worksBudget||""} onChange={e=>setWorksBudget(Number(e.target.value))} className="bg-black border-white/10 h-12 text-base text-white focus:border-[#d35f52]" placeholder="Optionnel"/>
                        </div>
                    </div>
                </div>

                {/* 2. PARAMÈTRES CRÉDIT */}
                <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl space-y-5">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-white/70 flex items-center gap-2"><Clock size={16}/> Hypothèse Bancaire</h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 flex items-center gap-1.5"><Clock size={12}/> Durée (Années)</label>
                            <Input type="number" value={loanDuration||""} onChange={e=>setLoanDuration(Number(e.target.value))} className="bg-black border-white/10 h-12 text-lg text-white focus:border-[#d35f52] text-center font-bold"/>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 flex items-center gap-1.5"><Percent size={12}/> Taux d'intérêt</label>
                            <Input type="number" step="0.1" value={interestRate||""} onChange={e=>setInterestRate(Number(e.target.value))} className="bg-black border-white/10 h-12 text-lg text-white focus:border-[#d35f52] text-center font-bold"/>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Mensualité Prêt</p>
                            <p className="text-3xl font-black text-white">{formatPrice(Math.round(monthlyPayment))} <span className="text-sm text-zinc-500 font-medium">€ /mois</span></p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Endettement</p>
                            <p className={`text-xl font-bold ${debtRatio > 35 ? 'text-rose-500' : 'text-emerald-500'}`}>{monthlyIncome > 0 ? debtRatio.toFixed(1) + "%" : "-"}</p>
                        </div>
                    </div>
                </div>

                {/* 3. OPTION LOCATIVE */}
                <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-[#c9a84c] flex items-center gap-2"><Key size={16}/> Mettre en Location</h2>
                        <Switch checked={isRental} onCheckedChange={setIsRental} />
                    </div>

                    {isRental && (
                        <div className="pt-4 border-t border-white/5 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
                            <div>
                                <label className="text-[11px] uppercase font-bold text-zinc-400 mb-2 block">Loyer Mensuel Estimé (€ HC)</label>
                                <Input type="number" value={expectedRent||""} onChange={e=>setExpectedRent(Number(e.target.value))} className="bg-black border-white/10 h-14 text-xl text-[#c9a84c] font-black focus:border-[#c9a84c]" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black p-4 rounded-2xl border border-white/5">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Renta Nette</p>
                                    <p className="text-xl font-black text-[#c9a84c]">{netYield.toFixed(2)} %</p>
                                </div>
                                <div className={`p-4 rounded-2xl border ${monthlyBalance >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                                    <p className={`text-[10px] uppercase font-bold mb-1 ${monthlyBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {monthlyBalance >= 0 ? "Cash-Flow Positif" : "Effort d'Épargne"}
                                    </p>
                                    <p className={`text-xl font-black ${monthlyBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {monthlyBalance >= 0 ? '+' : ''}{formatPrice(Math.round(monthlyBalance))} €<span className="text-[10px] font-medium opacity-70"> /mois</span>
                                    </p>
                                </div>
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-relaxed text-justify">
                                * Le résultat mensuel déduit la mensualité du crédit, la taxe foncière ({(data?.taxeFonciere || 0)/12}€/m) et les charges de copropriété ({(data?.coproFees || 0)}€/m) de vos revenus locatifs.
                            </p>
                        </div>
                    )}
                </div>

                {/* 4. GRAPHIQUE D'AMORTISSEMENT RÉEL (La FinTech) */}
                {loanAmount > 0 && (
                    <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-[#d35f52] flex items-center gap-2 mb-6"><TrendingUp size={16}/> Plan d'Amortissement</h2>
                        
                        {/* Afficheur en temps réel */}
                        <div className="mb-6 bg-black p-4 rounded-2xl border border-white/5">
                            <p className="text-[11px] uppercase tracking-widest font-bold text-zinc-400 mb-3 flex items-center gap-2">
                                <Clock size={14}/> À la fin de l'année <span className="text-white text-base bg-[#393939] px-2 py-0.5 rounded-md">{selectedYear}</span>
                            </p>
                            <div className="flex justify-between items-end border-b border-white/5 pb-3 mb-3">
                                <div><p className="text-[9px] text-zinc-500 uppercase font-bold">Capital Restant Dû</p><p className="text-xl font-black text-white">{formatPrice(Math.round(currentYearData.balance))} €</p></div>
                                <div className="text-right"><p className="text-[9px] text-zinc-500 uppercase font-bold">Capital Amorti</p><p className="text-lg font-bold text-emerald-500">{formatPrice(Math.round(currentYearData.cumulativePrincipal))} €</p></div>
                            </div>
                            <div>
                                <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1 flex items-center justify-between">
                                    <span>Intérêts cumulés payés</span>
                                    <span className="text-[#d35f52] font-black text-sm">{formatPrice(Math.round(currentYearData.cumulativeInterest))} €</span>
                                </p>
                            </div>
                        </div>

                        {/* Le Graphique Interactif SVG */}
                        <div className="relative w-full h-40 border-b border-l border-white/20 mb-4">
                            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                {/* Zone Capital Restant */}
                                <path d={`${balancePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`} fill="#393939" opacity="0.3" />
                                <path d={balancePath} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                
                                {/* Zone Intérêts Payés */}
                                <path d={`${interestPath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`} fill="#8a0e01" opacity="0.4" />
                                <path d={interestPath} fill="none" stroke="#d35f52" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                                {/* Curseur Vertical Interactif */}
                                <line 
                                    x1={(selectedYear / safeDuration) * svgWidth} 
                                    y1="0" 
                                    x2={(selectedYear / safeDuration) * svgWidth} 
                                    y2={svgHeight} 
                                    stroke="white" 
                                    strokeWidth="4" 
                                    strokeDasharray="10 10" 
                                />
                                <circle 
                                    cx={(selectedYear / safeDuration) * svgWidth} 
                                    cy={svgHeight - ((currentYearData.balance / loanAmount) * svgHeight)} 
                                    r="15" 
                                    fill="white" 
                                />
                            </svg>
                        </div>

                        {/* Le Slider de Navigation */}
                        <div className="mb-4 px-2">
                            <input 
                                type="range" 
                                min="1" 
                                max={safeDuration} 
                                value={selectedYear} 
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="w-full accent-[#d35f52] h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase mt-2">
                                <span>Début Prêt</span>
                                <span className="text-[#d35f52]">Glissez pour avancer dans le temps</span>
                                <span>Fin Prêt</span>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4 text-[10px] text-zinc-400 font-bold uppercase mt-6">
                            <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-white rounded-sm"></div> Capital Restant</span>
                            <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#d35f52] rounded-sm"></div> Intérêts Payés</span>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="text-center mt-10 opacity-50 pb-10">
                <img src="/logo-patrim.png" className="h-5 mx-auto mb-2 grayscale"/>
                <p className="text-[9px] uppercase tracking-widest font-bold">Outil de simulation Patrim non contractuel</p>
            </div>
        </div>
    );
}