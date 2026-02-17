"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Home, Building, Wallet, Landmark, CheckCircle, PieChart as PieIcon, Scale, BedDouble, Armchair, Briefcase, Save, HelpCircle, FileText, Trash2, FolderOpen, MousePointerClick, TrendingUp, AlertTriangle, Crown, BarChart3, Check, Printer, Shield, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import AnimatedNumber from "@/components/AnimatedNumber";
import { supabase } from "@/lib/supabaseClient";
import { useReactToPrint } from "react-to-print"; 
import { NexusLogo } from "@/components/NexusLogo"; 

const formatEuro = (val: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);

// --- COMPOSANT DOSSIER BANCAIRE (INTELLIGENT & CONTEXTUEL) ---
const DossierBancaire = ({ data, refProp }: any) => {
    const d = data || {};
    const totalCost = (d.price || 0) + (d.works || 0) + (d.notaryFees || 0);
    const isLoc = d.projectType === "LOC";
    const isRP = d.projectType === "RP";
    
    // FIX HYDRATION: Date calculée uniquement au montage
    const [dateStr, setDateStr] = useState("");
    useEffect(() => {
        setDateStr(new Date().toLocaleDateString("fr-FR"));
    }, []);

    return (
      <div style={{ display: "none" }}>
        <div ref={refProp} className="p-12 bg-white text-black font-sans min-h-[29.7cm] w-[21cm] mx-auto relative flex flex-col justify-between">
            
            <div>
                {/* Header */}
                <div className="flex justify-between items-center border-b-2 border-black/10 pb-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="text-black"><NexusLogo className="w-12 h-12"/></div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter text-black leading-none">NEXUS <span className="text-indigo-600">INVEST</span></h1>
                            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1">Dossier de Financement</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-base font-bold text-gray-900">{d.name || "Projet Immobilier"}</p>
                        <span className="inline-block bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide mt-1">
                            {isLoc ? "Investissement Locatif" : isRP ? "Résidence Principale" : "Résidence Secondaire"}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{dateStr}</p>
                    </div>
                </div>

                {/* Synthèse Projet */}
                <div className="grid grid-cols-2 gap-8 mb-10">
                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase text-indigo-600 mb-4 flex items-center gap-2 tracking-widest"><Home size={14}/> L'Acquisition</h3>
                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex justify-between"><span>Prix Net Vendeur</span> <span className="font-bold text-gray-900">{formatEuro(d.price)}</span></div>
                            <div className="flex justify-between"><span>Travaux Estimés</span> <span className="font-bold text-gray-900">{formatEuro(d.works)}</span></div>
                            <div className="flex justify-between"><span>Frais de Notaire</span> <span className="font-bold text-gray-900">{formatEuro(d.notaryFees)}</span></div>
                            <div className="h-px bg-gray-200 my-2"></div>
                            <div className="flex justify-between text-base font-black text-black"><span>COÛT TOTAL</span> <span>{formatEuro(totalCost)}</span></div>
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase text-indigo-600 mb-4 flex items-center gap-2 tracking-widest"><Landmark size={14}/> Le Financement</h3>
                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex justify-between"><span>Apport Personnel</span> <span className="font-bold text-gray-900">{formatEuro(d.apport)}</span></div>
                            <div className="flex justify-between"><span>Emprunt Sollicité</span> <span className="font-bold text-gray-900">{formatEuro(totalCost - d.apport)}</span></div>
                            <div className="flex justify-between"><span>Conditions</span> <span className="font-bold text-gray-900">{d.duration} ans à {d.rate}%</span></div>
                            <div className="h-px bg-gray-200 my-2"></div>
                            <div className="flex justify-between text-base font-black text-black"><span>Mensualité (Hors Ass.)</span> <span>{formatEuro(d.monthlyPayment || 0)}</span></div>
                        </div>
                    </div>
                </div>

                {/* Indicateurs Clés (Adaptatifs) */}
                <div className="mb-10">
                    <h3 className="text-sm font-black uppercase text-gray-900 mb-4 border-l-4 border-indigo-600 pl-3">Indicateurs Financiers</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {isLoc ? (
                            <>
                                <div className="p-5 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                                    <p className="text-[9px] uppercase font-bold text-indigo-400 mb-1 tracking-wider">Rendement Brut</p>
                                    <p className="text-3xl font-black text-indigo-700">{Number(d.yieldNet).toFixed(2)}%</p>
                                </div>
                                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                                    <p className="text-[9px] uppercase font-bold text-emerald-600 mb-1 tracking-wider">Cashflow Net / Mois</p>
                                    <p className={`text-3xl font-black ${d.cashflowNetImpots > 0 ? "text-emerald-700" : "text-amber-600"}`}>{d.cashflowNetImpots > 0 ? "+":""}{Math.round(d.cashflowNetImpots)}€</p>
                                </div>
                                <div className="p-5 rounded-xl bg-gray-50 border border-gray-200 text-center">
                                    <p className="text-[9px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Loyer Annuel</p>
                                    <p className="text-3xl font-black text-gray-800">{formatEuro(d.rent * 12)}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="p-5 rounded-xl bg-gray-50 border border-gray-200 text-center">
                                    <p className="text-[9px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Effort Mensuel Total</p>
                                    <p className="text-3xl font-black text-gray-800">{formatEuro(Math.round(d.monthlyPayment + (d.charges || 0) + ((d.tax || 0)/12)))}</p>
                                    <p className="text-[9px] text-gray-400 mt-1">Crédit + Charges + Taxe</p>
                                </div>
                                <div className="p-5 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                                    <p className="text-[9px] uppercase font-bold text-indigo-400 mb-1 tracking-wider">Coût Total Crédit</p>
                                    <p className="text-3xl font-black text-indigo-700">{formatEuro(Math.round(d.totalCreditCost))}</p>
                                    <p className="text-[9px] text-indigo-300 mt-1">Intérêts bancaires</p>
                                </div>
                                <div className="p-5 rounded-xl bg-amber-50 border border-amber-100 text-center">
                                    <p className="text-[9px] uppercase font-bold text-amber-500 mb-1 tracking-wider">Capitalisation / Mois</p>
                                    <p className="text-3xl font-black text-amber-700">~{formatEuro(Math.round(d.monthlyPayment * 0.6))}</p>
                                    <p className="text-[9px] text-amber-600 mt-1">Épargne forcée</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Analyse Stratégique (Adaptatif) */}
                <div className="mb-10">
                    <h3 className="text-sm font-black uppercase text-gray-900 mb-4 border-l-4 border-indigo-600 pl-3">Analyse Stratégique</h3>
                    <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
                        {isLoc ? (
                            <>
                                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                                    Ce projet est structuré pour maximiser la rentabilité nette via le régime 
                                    <strong className="text-black uppercase"> {d.rentalStrategy === "LMNP" ? "LMNP (Loueur Meublé Non Pro)" : d.rentalStrategy} </strong> 
                                    au <strong className="text-black uppercase">{d.rentalStrategy !== "NUE" ? "RÉEL" : "FONCIER"}</strong>.
                                </p>
                                <ul className="grid grid-cols-2 gap-3 text-xs text-gray-600 font-medium">
                                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/> Déductibilité des intérêts d'emprunt</li>
                                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/> Amortissement comptable (Gomme l'impôt)</li>
                                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/> Optimisation du Cashflow Net</li>
                                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/> Effet de levier bancaire</li>
                                </ul>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                                    Acquisition patrimoniale à usage de <strong>{isRP ? "RÉSIDENCE PRINCIPALE" : "RÉSIDENCE SECONDAIRE"}</strong>. 
                                    L'objectif est la sécurisation du logement et la transformation d'un flux locatif à fonds perdus en épargne forcée (capitalisation).
                                </p>
                                <ul className="grid grid-cols-2 gap-3 text-xs text-gray-600 font-medium">
                                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-500"/> Constitution de Patrimoine Long Terme</li>
                                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-500"/> Protection contre l'inflation</li>
                                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-amber-500"/> Capitalisation mensuelle via le crédit</li>
                                    {isRP && <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/> <strong>Exonération Totale de Plus-Value (RP)</strong></li>}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Legal */}
            <div className="border-t pt-6 text-center">
                <p className="text-[9px] text-gray-400 font-medium uppercase tracking-widest">
                    Données non contractuelles basées sur les informations fournies par l'utilisateur. <br/>
                    Document généré par Nexus Invest. Ne constitue pas une offre de prêt.
                </p>
            </div>
        </div>
      </div>
    );
};

// --- COMPOSANT PEDAGOGIQUE ---
const Help = ({ title, text }: { title: string, text: string }) => (
  <div className="group/help relative inline-flex items-center ml-2 align-middle cursor-help z-[999]">
    <HelpCircle size={14} className="text-zinc-500 group-hover/help:text-indigo-400 transition-colors duration-300"/>
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 md:w-72 p-4 bg-[#121217] border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover/help:visible group-hover/help:opacity-100 transition-all duration-200 z-[9999] translate-y-2 group-hover/help:translate-y-0 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">{title}</span>
        </div>
        <span className="block text-xs text-zinc-300 leading-relaxed font-light">{text}</span>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#121217] border-b border-r border-white/10 rotate-45"></div>
    </div>
  </div>
);

// --- SLIDER PREMIUM ---
const PremiumSlider = ({ label, value, min, max, step, unit, onChange }: any) => (
    <div className="group relative bg-black/40 rounded-2xl p-4 border border-white/5 hover:border-indigo-500/30 transition-all duration-300">
        <div className="flex justify-between items-end mb-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider group-hover:text-indigo-400 transition-colors">{label}</label>
            <div className="font-mono text-xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-cyan-400 transition-all">
                {value} <span className="text-sm text-zinc-600 font-medium">{unit}</span>
            </div>
        </div>
        <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} className="py-2 cursor-grab active:cursor-grabbing" />
        <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-hover:via-indigo-500/50 transition-all duration-500"></div>
    </div>
);

// --- CARTE PREMIUM ---
const PremiumCard = ({ children, className = "", color = "indigo" }: { children: React.ReactNode, className?: string, color?: string }) => {
    const borderColor = color === "emerald" ? "hover:border-emerald-500/30" : color === "rose" ? "hover:border-rose-500/30" : color === "amber" ? "hover:border-amber-500/30" : color === "blue" ? "hover:border-blue-500/30" : "hover:border-indigo-500/30";
    const shadowColor = color === "emerald" ? "hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.15)]" : color === "rose" ? "hover:shadow-[0_0_40px_-10px_rgba(244,63,94,0.15)]" : color === "amber" ? "hover:shadow-[0_0_40px_-10px_rgba(245,158,11,0.15)]" : color === "blue" ? "hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.15)]" : "hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.15)]";
    
    return (
        <div className={`relative rounded-[32px] bg-zinc-900/40 backdrop-blur-md border border-white/5 transition-all duration-500 ${borderColor} ${shadowColor} hover:bg-zinc-900/60 group ${className}`}>
            {children}
        </div>
    );
};

export default function SimulateurPage() {
  const [mode, setMode] = useState<"CAPACITE" | "RENTABILITE" | "FISCALITE" | "PROJETS">("CAPACITE");
  const [savedSimulations, setSavedSimulations] = useState<any[]>([]);
  const [projectName, setProjectName] = useState("");
  const [importingId, setImportingId] = useState<number | null>(null);
  
  // REF POUR IMPRESSION PDF
  const componentRef = useRef(null);
  const [printData, setPrintData] = useState<any>(null); 

  // Impression Fix v3
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Dossier_Financement_Nexus",
  });

  const prepareAndPrint = (sim: any) => {
      setPrintData(sim.data ? { ...sim.data, name: sim.name } : null);
      setTimeout(() => {
          handlePrint();
      }, 500); 
  };

  // --- PARAMÈTRES GLOBAUX ---
  const [revenue, setRevenue] = useState<number | string>(2500);
  const [credits, setCredits] = useState<number | string>(0);
  const [duration, setDuration] = useState(25);
  const [rate, setRate] = useState(3.8);
  const [apportCapacity, setApportCapacity] = useState<number | string>(30000); 
  const [maxLoan, setMaxLoan] = useState(0);
  const [maxMonthly, setMaxMonthly] = useState(0);
  const [totalEnvelope, setTotalEnvelope] = useState(0); 
  const [price, setPrice] = useState<number | string>(200000);
  const [works, setWorks] = useState<number | string>(0);
  const [notaryRate, setNotaryRate] = useState<number | string>(8); 
  const [apport, setApport] = useState<number | string>(20000);
  const [projectType, setProjectType] = useState<"RP" | "RS" | "LOC">("LOC"); 
  const [rentalStrategy, setRentalStrategy] = useState<"NUE" | "LMNP" | "LCD">("LMNP"); 
  const [userTMI, setUserTMI] = useState(30); 
  const [resalePrice, setResalePrice] = useState<number | string>(300000);
  const [holdingYears, setHoldingYears] = useState(10);
  const [rent, setRent] = useState<number | string>(1200);
  const [charges, setCharges] = useState<number | string>(100);
  const [tax, setTax] = useState<number | string>(800); 
  const [cashflowBrut, setCashflowBrut] = useState(0); 
  const [cashflowNetImpots, setCashflowNetImpots] = useState(0); 
  const [yieldNet, setYieldNet] = useState(0);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [notaryFees, setNotaryFees] = useState(0);
  const [totalCreditCost, setTotalCreditCost] = useState(0);
  const [fiscalData, setFiscalData] = useState({ micro: { total: 0, base: 0 }, reel: { total: 0, charges: 0, interests: 0, amortissement: 0, base: 0 } });
  const [capitalGainData, setCapitalGainData] = useState({ grossGain: 0, acquisitionPrice: 0, totalTax: 0, netGain: 0 });
  const [yearOneInterest, setYearOneInterest] = useState(0);
  const [amortizationSchedule, setAmortizationSchedule] = useState<any[]>([]);

  const handleInput = (setter: (v: any) => void, val: string) => { if (val === "") setter(""); else setter(Number(val)); };

  useEffect(() => {
    const loadProjets = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data } = await supabase.from('profiles').select('simulations_json').eq('id', session.user.id).single();
            if (data && data.simulations_json) setSavedSimulations(data.simulations_json);
        }
    };
    loadProjets();
  }, []);

  // --- ENGINE DE CALCUL ---
  useEffect(() => {
    const safeRevenue = Number(revenue) || 0;
    const safeCredits = Number(credits) || 0;
    const safeApportCap = Number(apportCapacity) || 0;
    const availableIncome = (safeRevenue * 0.35) - safeCredits;
    const mRate = rate / 100 / 12;
    const nMonths = duration * 12;
    let capacity = 0;
    if (availableIncome > 0) capacity = availableIncome * (1 - Math.pow(1 + mRate, -nMonths)) / mRate;
    setMaxLoan(Math.max(0, Math.round(capacity)));
    setMaxMonthly(Math.max(0, Math.round(availableIncome)));
    setTotalEnvelope(Math.max(0, Math.round(capacity)) + safeApportCap);

    const safePrice = Number(price) || 0;
    const safeWorks = Number(works) || 0;
    const safeNotaryRate = Number(notaryRate) || 0;
    const safeApportProj = Number(apport) || 0;
    const safeRent = Number(rent) || 0;
    const safeCharges = Number(charges) || 0;
    const safeTax = Number(tax) || 0;
    const notFees = safePrice * (safeNotaryRate / 100);
    setNotaryFees(notFees);
    const total = safePrice + safeWorks + notFees;
    setTotalCost(total);
    const loanAmount = Math.max(0, total - safeApportProj);
    let mensu = 0; let y1Interest = 0; let costCredit = 0; let schedule = [];
    if (loanAmount > 0) {
        mensu = loanAmount * (mRate / (1 - Math.pow(1 + mRate, -nMonths)));
        let remainingCapital = loanAmount;
        let cumulativeInterests = 0;
        for (let y = 1; y <= duration; y++) {
            let interestYear = 0;
            for (let m = 0; m < 12; m++) {
                const interestMonth = remainingCapital * mRate;
                interestYear += interestMonth;
                const capitalRepaid = mensu - interestMonth;
                remainingCapital -= capitalRepaid;
            }
            if (y === 1) y1Interest = interestYear; 
            cumulativeInterests += interestYear;
            schedule.push({ year: `An ${y}`, capital: Math.max(0, Math.round(remainingCapital)), interests: Math.round(cumulativeInterests) });
        }
        costCredit = (mensu * nMonths) - loanAmount;
    }
    setMonthlyPayment(mensu); setYearOneInterest(y1Interest); setTotalCreditCost(costCredit); setAmortizationSchedule(schedule);

    const annualRent = safeRent * 12;
    const annualCharges = (safeCharges * 12) + safeTax;
    const annualCredit = mensu * 12;
    const cfBrutAnnual = annualRent - annualCharges - annualCredit;
    setCashflowBrut(cfBrutAnnual / 12);

    if (projectType === "LOC") {
        let abattement = 0;
        if (rentalStrategy === "NUE") abattement = 0.30; else if (rentalStrategy === "LMNP") abattement = 0.50; else if (rentalStrategy === "LCD") abattement = 0.71; 
        const baseMicro = Math.max(0, annualRent * (1 - abattement));
        const taxMicro = baseMicro * (userTMI / 100) + baseMicro * 0.172;
        let amo = 0;
        if (rentalStrategy !== "NUE") { const bati = safePrice * 0.85; amo = (bati / 30) + (safeWorks / 15) + (5000 / 7) + (notFees / 25); }
        const resultatComptable = annualRent - annualCharges - y1Interest - amo; 
        const baseReel = Math.max(0, resultatComptable);
        const taxReel = baseReel * (userTMI / 100) + baseReel * 0.172;
        setFiscalData({ micro: { base: baseMicro, total: taxMicro }, reel: { base: baseReel, total: taxReel, charges: annualCharges, interests: y1Interest, amortissement: amo } });
        const bestTax = Math.min(taxMicro, taxReel);
        setCashflowNetImpots((cfBrutAnnual - bestTax) / 12);
        setYieldNet(total > 0 ? ((annualRent - annualCharges) / total) * 100 : 0);
    } else {
        setCashflowNetImpots(-(mensu + safeCharges + (safeTax / 12)));
        setYieldNet(0); 
        const notaireRetenu = Math.max(notFees, safePrice * 0.075);
        const travauxRetenus = holdingYears > 5 ? Math.max(safeWorks, safePrice * 0.15) : safeWorks;
        const acquisitionRetenue = safePrice + notaireRetenu + travauxRetenus;
        const grossGain = Math.max(0, (Number(resalePrice)||0) - acquisitionRetenue);
        let taxTotal = 0;
        if (projectType === "RS") { const abattementApprox = Math.min(1, Math.max(0, (holdingYears - 5) * 0.06)); taxTotal = grossGain * (1 - abattementApprox) * (0.362); }
        setCapitalGainData({ grossGain, acquisitionPrice: acquisitionRetenue, totalTax: taxTotal, netGain: grossGain - taxTotal });
    }
  }, [revenue, credits, duration, rate, apportCapacity, price, works, notaryRate, apport, rent, charges, tax, projectType, rentalStrategy, userTMI, resalePrice, holdingYears]);

  const saveSimulation = async () => {
      if (!projectName) { alert("Nommez votre projet !"); return; }
      const newSim = {
          id: Date.now(),
          name: projectName,
          date: new Date().toISOString(),
          data: { 
              price, works, notaryRate, notaryFees, apport, 
              rent, charges, tax, 
              duration, rate, totalCreditCost, monthlyPayment,
              cashflowNetImpots, yieldNet, projectType, rentalStrategy,
              revenue, credits 
          }
      };
      const updated = [newSim, ...savedSimulations];
      setSavedSimulations(updated);
      setProjectName("");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').update({ simulations_json: updated }).eq('id', user.id);
      setMode("PROJETS");
  };

  const loadSimulation = (sim: any) => {
      const d = sim.data; setPrice(d.price); setWorks(d.works); setNotaryRate(d.notaryRate || 8); setApport(d.apport); setRent(d.rent); setCharges(d.charges); setTax(d.tax); setDuration(d.duration); setRate(d.rate); setProjectType(d.projectType); setRentalStrategy(d.rentalStrategy); setMode("RENTABILITE");
  };

  const importToPatrimoine = async (sim: any) => {
      setImportingId(sim.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('assets_json').eq('id', session.user.id).single();
      const currentAssets = profile?.assets_json || [];
      const d = sim.data;
      const newAsset = { id: Date.now().toString(), name: sim.name, type: "Immobilier", value: d.price, buyPrice: d.price, notaryFees: d.notaryFees, workCost: d.works, loanCost: d.totalCreditCost };
      const updatedAssets = [...currentAssets, newAsset];
      const newNetWorth = updatedAssets.reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0);
      await supabase.from('profiles').update({ assets_json: updatedAssets, net_worth: newNetWorth }).eq('id', session.user.id);
      setTimeout(() => { setImportingId(null); alert("Projet importé dans votre Patrimoine !"); }, 1000);
  };

  const deleteSimulation = async (id: number) => {
      const updated = savedSimulations.filter(s => s.id !== id);
      setSavedSimulations(updated);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').update({ simulations_json: updated }).eq('id', user.id);
  };

  const dataCost = [{ name: 'Prix Net', value: Number(price) || 0, color: '#3b82f6' }, { name: 'Travaux', value: Number(works) || 0, color: '#eab308' }, { name: 'Notaire', value: notaryFees, color: '#ef4444' }].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans pb-24 md:pb-8 selection:bg-indigo-500/30 selection:text-indigo-200">
      <Sidebar />
      <main className="md:ml-64 flex-1 w-auto max-w-full p-4 md:p-8 relative overflow-hidden">
        
        {/* COMPOSANT CACHÉ POUR L'IMPRESSION */}
        <DossierBancaire refProp={componentRef} data={printData} />

        <div className="fixed top-0 left-64 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[150px] pointer-events-none"></div>
        
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1800px] mx-auto space-y-10 relative z-10">
          
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 pl-2 border-l-4 border-indigo-600 py-2">
            <div><h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">Simulateur <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Expert 360°</span></h1><p className="text-zinc-400 text-sm md:text-base font-light tracking-wide mt-2">Analysez, optimisez fiscalement et structurez vos investissements.</p></div>
            <div className="bg-zinc-900/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 flex flex-wrap gap-1 w-full xl:w-auto shadow-2xl">
                {[{ id: "CAPACITE", label: "Capacité", icon: Wallet }, { id: "RENTABILITE", label: "Projet & Renta", icon: Calculator }, { id: "FISCALITE", label: "Fiscalité Expert", icon: Scale }, { id: "PROJETS", label: "Portefeuille", icon: FolderOpen }].map((tab) => (
                    <button key={tab.id} onClick={() => setMode(tab.id as any)} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${mode === tab.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105" : "text-zinc-500 hover:text-white hover:bg-white/5"}`}><tab.icon size={16}/> {tab.label}</button>
                ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
          
          {mode === "CAPACITE" && (
            <motion.div key="capa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-4 space-y-6">
                    <PremiumCard className="p-8">
                        <h3 className="text-xs font-black text-indigo-400 uppercase mb-8 flex items-center gap-3 tracking-widest"><Wallet size={18}/> Revenus</h3>
                        <div className="space-y-6">
                            <div className="space-y-2"><div className="flex justify-between"><label className="text-[10px] font-bold text-zinc-500 uppercase">Salaire Net / Mois</label></div><Input type="number" value={revenue} onChange={e => handleInput(setRevenue, e.target.value)} className="bg-black/40 border-white/10 h-14 text-white font-bold text-xl focus:border-indigo-500"/></div>
                            <div className="space-y-2"><div className="flex justify-between"><label className="text-[10px] font-bold text-zinc-500 uppercase">Crédits en cours</label></div><Input type="number" value={credits} onChange={e => handleInput(setCredits, e.target.value)} className="bg-black/40 border-white/10 h-14 text-white font-bold text-xl focus:border-indigo-500"/></div>
                            <div className="space-y-2 pt-4 border-t border-white/5"><label className="text-[10px] font-bold text-emerald-500 uppercase">Apport Perso</label><Input type="number" value={apportCapacity} onChange={e => handleInput(setApportCapacity, e.target.value)} className="bg-emerald-900/10 border-emerald-500/20 h-14 text-emerald-400 font-bold text-xl focus:border-emerald-500"/></div>
                        </div>
                    </PremiumCard>
                    <PremiumCard className="p-8">
                        <h3 className="text-xs font-black text-blue-400 uppercase mb-8 flex items-center gap-3 tracking-widest"><Landmark size={18}/> Banque</h3>
                        <div className="space-y-6">
                            <PremiumSlider label="Durée" value={duration} min={10} max={30} step={1} unit="ans" onChange={setDuration}/>
                            <PremiumSlider label="Taux" value={rate} min={1} max={6} step={0.05} unit="%" onChange={setRate}/>
                        </div>
                    </PremiumCard>
                </div>
                <div className="lg:col-span-8 p-16 rounded-[48px] bg-gradient-to-br from-zinc-900 via-black to-blue-950/20 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
                    <div className="relative z-10">
                        <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.4em] mb-8">ENVELOPPE GLOBALE</p>
                        <div className="text-7xl lg:text-[9rem] font-black text-white tracking-tighter"><AnimatedNumber value={totalEnvelope} /></div>
                        <div className="mt-10 flex gap-6 justify-center text-sm font-bold text-zinc-500 bg-white/5 px-8 py-4 rounded-full border border-white/5 backdrop-blur-md">
                             <span className="flex items-center gap-2"><Landmark size={14} className="text-blue-500"/> Banque: {formatEuro(maxLoan)}</span>
                             <span className="text-zinc-700 mx-2">|</span>
                             <span className="flex items-center gap-2"><PiggyBank size={14} className="text-emerald-500"/> Apport: {formatEuro(Number(apportCapacity))}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
          )}

          {mode === "RENTABILITE" && (
            <motion.div key="renta" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-4 space-y-6">
                    <PremiumCard className="p-6">
                        <h3 className="text-xs font-black text-white uppercase flex items-center gap-3 mb-6 tracking-widest"><Building size={18}/> Le Projet</h3>
                        <div className="bg-black/40 p-4 rounded-2xl mb-6 border border-white/5">
                            <div className="mb-4">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Usage</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['LOC', 'RP', 'RS'].map(t => (
                                        <button key={t} onClick={() => setProjectType(t as any)} className={`text-[10px] font-bold py-2 rounded-lg transition-all ${projectType === t ? "bg-zinc-700 text-white shadow-inner" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}>{t === 'LOC' ? 'Invest.' : t === 'RP' ? 'Principale' : 'Secondaire'}</button>
                                    ))}
                                </div>
                            </div>
                            {projectType === "LOC" && (
                                <div className="animate-in slide-in-from-top-2 fade-in">
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Stratégie Locative</label>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['LMNP', 'NUE', 'LCD'].map(s => (
                                            <button key={s} onClick={() => setRentalStrategy(s as any)} className={`text-[10px] font-bold py-2 rounded-lg transition-all ${rentalStrategy === s ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}>{s}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Prix Achat</label><Input type="number" value={price} onChange={e => handleInput(setPrice, e.target.value)} className="bg-black/40 border-white/10 h-12 text-white font-bold"/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Travaux</label><Input type="number" value={works} onChange={e => handleInput(setWorks, e.target.value)} className="bg-black/40 border-white/10 h-12 text-white font-bold"/></div>
                                <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Apport</label><Input type="number" value={apport} onChange={e => handleInput(setApport, e.target.value)} className="bg-black/40 border-white/10 h-12 text-white font-bold"/></div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1"><label className="text-[10px] font-bold text-zinc-500 uppercase">Notaire (%)</label></div>
                                <Input type="number" step="0.1" value={notaryRate} onChange={e => handleInput(setNotaryRate, e.target.value)} className="bg-black/40 border-white/10 h-12 text-white font-bold"/>
                            </div>
                            <div className="pt-4 border-t border-white/5 space-y-3">
                                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2"><Landmark size={12}/> Financement Bancaire</h4>
                                <div className="space-y-3">
                                    <PremiumSlider label="Taux" value={rate} min={1} max={6} step={0.05} unit="%" onChange={setRate}/>
                                    <PremiumSlider label="Durée" value={duration} min={10} max={30} step={1} unit="ans" onChange={setDuration}/>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/5 space-y-4">
                                <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2"><Home size={12}/> Exploitation & Charges</h4>
                                {projectType === "LOC" && (
                                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Loyer Mensuel CC</label><Input type="number" value={rent} onChange={e => handleInput(setRent, e.target.value)} className="bg-black/40 border-white/10 h-12 text-emerald-400 font-bold"/></div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Charges /m</label><Input type="number" value={charges} onChange={e => handleInput(setCharges, e.target.value)} className="bg-black/40 border-white/10 h-12 text-white font-bold"/></div>
                                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Taxe Foncière /an</label><Input type="number" value={tax} onChange={e => handleInput(setTax, e.target.value)} className="bg-black/40 border-white/10 h-12 text-white font-bold"/></div>
                                </div>
                            </div>
                        </div>
                    </PremiumCard>
                </div>
                <div className="xl:col-span-8 space-y-6">
                    {projectType === "LOC" ? (
                        <PremiumCard className={`p-10 text-center flex flex-col items-center justify-center min-h-[300px] border transition-all duration-500 ${cashflowNetImpots < 0 ? 'border-rose-500/40' : 'border-emerald-500/20'}`}>
                            <div className="flex items-center gap-2 mb-6 justify-center">
                                <span className={`text-xs font-black uppercase tracking-[0.3em] ${cashflowNetImpots > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>CASHFLOW NET D'IMPÔT / MOIS</span>
                                <Help title="Cashflow Net" text="Loyers - (Crédit + Charges + Taxe Fonc. + Impôts)."/>
                            </div>
                            <div className={`text-8xl font-black tracking-tighter mb-8 ${cashflowNetImpots > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{cashflowNetImpots > 0 ? '+':''}<AnimatedNumber value={Math.round(cashflowNetImpots)}/></div>
                            <div className="flex justify-center gap-12 text-sm font-bold w-full max-w-lg bg-black/30 p-4 rounded-2xl border border-white/5">
                                <div className="text-zinc-400 flex flex-col">Avant Impôt <span className="text-white text-lg">{cashflowBrut > 0 ? "+":""}{Math.round(cashflowBrut)}€</span></div>
                                <div className="w-[1px] bg-white/10"></div>
                                <div className="text-zinc-400 flex flex-col">Fiscalité Moy. <span className="text-amber-500 text-lg">-{Math.round(Math.min(fiscalData.micro.total, fiscalData.reel.total)/12)}€</span></div>
                            </div>
                        </PremiumCard>
                    ) : (
                        <PremiumCard className="p-10 text-center flex flex-col items-center justify-center min-h-[300px] border-amber-500/20">
                            <div className="flex items-center gap-2 mb-4 justify-center">
                                <span className="text-xs font-black text-amber-500 uppercase tracking-[0.4em]">COÛT MENSUEL TOTAL</span>
                            </div>
                            <div className="text-7xl font-black text-white tracking-tighter mb-4">-<AnimatedNumber value={Math.round(monthlyPayment + Number(charges) + (Number(tax)/12))}/></div>
                            <div className="flex gap-4 text-xs font-bold text-zinc-500 bg-white/5 px-6 py-2 rounded-full border border-white/10">
                                <span>Crédit: {Math.round(monthlyPayment)}€</span><span>Charges: {Math.round(Number(charges))}€</span><span>Taxe: {Math.round(Number(tax)/12)}€</span>
                            </div>
                        </PremiumCard>
                    )}
                    <div className="grid grid-cols-2 gap-6">
                        {projectType === "LOC" ? (
                            <PremiumCard color="emerald" className="p-6 flex flex-col items-center justify-center">
                                <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Rendement Brut</p>
                                <div className="text-5xl font-black text-white">{yieldNet.toFixed(2)}<span className="text-emerald-500 text-2xl">%</span></div>
                            </PremiumCard>
                        ) : (
                            <PremiumCard color="rose" className="p-6 flex flex-col items-center justify-center">
                                <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Coût Total Crédit</p>
                                <div className="text-5xl font-black text-white">{formatEuro(Math.round(totalCreditCost))}<span className="text-rose-500 text-2xl text-xs ml-2">Intérêts</span></div>
                            </PremiumCard>
                        )}
                        <PremiumCard color="indigo" className="p-6 flex flex-col items-center justify-center">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Coût Projet</p>
                            <div className="text-5xl font-black text-white">{Math.round(totalCost/1000)}<span className="text-indigo-500 text-2xl">k€</span></div>
                        </PremiumCard>
                    </div>
                    {/* CHART */}
                    <PremiumCard className="p-8 border-white/5 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3"><BarChart3 size={18} className="text-blue-500"/> Amortissement</h4>
                            <div className="text-xs text-zinc-500 font-mono">Projection sur {duration} ans</div>
                        </div>
                        <div className="h-[250px] w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={amortizationSchedule} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="100%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="year" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val, index) => index % 5 === 0 ? val : ''} />
                                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize:'12px' }} itemStyle={{ color: '#fff' }} formatter={(val: any) => formatEuro(val)}/>
                                    <Area type="monotone" dataKey="capital" stackId="1" stroke="#3b82f6" fill="url(#colorCapital)" name="Capital Restant" strokeWidth={2}/>
                                    <Area type="monotone" dataKey="interests" stackId="2" stroke="#ef4444" fill="url(#colorInterest)" name="Intérêts Cumulés" strokeWidth={2}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </PremiumCard>
                    
                    <div className="flex gap-4">
                        <Input placeholder="Nom du projet (ex: Studio Lille)" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="bg-zinc-900 border-white/10 h-14 rounded-2xl text-white focus:border-indigo-500"/>
                        <Button onClick={saveSimulation} className="h-14 px-8 bg-white text-black hover:bg-zinc-200 font-bold rounded-2xl gap-2 shadow-lg"><Save size={20}/> Sauvegarder</Button>
                    </div>
                </div>
            </motion.div>
          )}

          {mode === "FISCALITE" && (
            <motion.div key="fiscal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 gap-8">
                {projectType === "LOC" ? (
                    <PremiumCard className="p-10 bg-gradient-to-br from-[#0B0B0F] to-black border-indigo-500/20">
                        {/* Header Responsive */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30"><Scale size={24}/></div>
                                <div><h2 className="text-2xl font-black text-white uppercase">Matrice Fiscale <span className="text-indigo-500">Expert</span></h2></div>
                            </div>
                            <div className="flex items-center gap-3 bg-zinc-900/80 p-2 rounded-xl border border-white/5">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase ml-2">Votre TMI</span>
                                <div className="flex gap-1">
                                    {[0, 11, 30, 41, 45].map((t) => (
                                        <button key={t} onClick={() => setUserTMI(t)} className={`h-8 w-10 rounded-lg text-xs font-bold transition-all ${userTMI === t ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"}`}>{t}%</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* Tableau Responsive */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="hidden md:block space-y-4 pt-16 text-right text-sm text-zinc-400 font-medium">
                                <div className="h-10 flex items-center justify-end gap-2">Recettes Locatives <Help title="Recettes" text="Loyer annuel"/></div>
                                <div className="h-10 flex items-center justify-end gap-2">Charges Déductibles <Help title="Charges" text="Charges copro, TF..."/></div>
                                <div className="h-10 flex items-center justify-end gap-2 text-blue-400">Intérêts d'Emprunt <Help title="Intérêts" text="100% déductibles au réel"/></div>
                                <div className="h-10 flex items-center justify-end gap-2 text-indigo-400">Amortissement (LMNP) <Help title="Amortissement" text="Charge fictive"/></div>
                                <div className="h-1 p-0 m-0"></div>
                                <div className="h-10 flex items-center justify-end text-white font-bold">Base Imposable</div>
                                <div className="h-10 flex items-center justify-end text-amber-500">Impôt Final (TMI + PS)</div>
                            </div>
                            {/* Colonne MICRO */}
                            <div className={`rounded-2xl p-6 border transition-all ${fiscalData.micro.total < fiscalData.reel.total ? "bg-emerald-900/10 border-emerald-500/50" : "bg-black/20 border-white/5"}`}>
                                <div className="text-center mb-6"><h4 className="font-black text-white uppercase">Régime Micro</h4></div>
                                <div className="space-y-4 text-center font-mono text-sm">
                                    <div className="flex justify-between md:justify-center items-center h-auto md:h-10 py-2 md:py-0 border-b border-white/5 md:border-none"><span className="md:hidden text-xs text-zinc-500">Recettes</span><span className="text-white">{formatEuro(Number(rent)*12)}</span></div>
                                    <div className="flex justify-between md:justify-center items-center h-auto md:h-10 py-2 md:py-0 border-b border-white/5 md:border-none"><span className="md:hidden text-xs text-zinc-500">Charges</span><span className="text-zinc-600 italic">Forfaitaire</span></div>
                                    <div className="flex justify-between md:justify-center items-center h-auto md:h-10 py-2 md:py-0 border-b border-white/5 md:border-none"><span className="md:hidden text-xs text-zinc-500">Intérêts</span><span className="text-zinc-600 italic">Non déductible</span></div>
                                    <div className="flex justify-between md:justify-center items-center h-auto md:h-10 py-2 md:py-0 border-b border-white/5 md:border-none"><span className="md:hidden text-xs text-zinc-500">Amortissement</span><span className="text-zinc-600 italic">Non applicable</span></div>
                                    <div className="hidden md:block h-1 bg-white/5 my-2"></div>
                                    <div className="flex justify-between md:justify-center items-center h-auto md:h-10 py-2 md:py-0 border-b border-white/5 md:border-none"><span className="md:hidden text-xs text-white font-bold">Base Imp.</span><span className="text-white font-bold text-lg">{formatEuro(fiscalData.micro.base)}</span></div>
                                    <div className="flex justify-between md:justify-center items-center h-auto md:h-10 py-2 md:py-0"><span className="md:hidden text-xs text-amber-500 font-bold">Impôt Total</span><span className="text-amber-500 font-bold">{formatEuro(fiscalData.micro.total)}</span></div>
                                </div>
                            </div>
                            {/* Colonne REEL */}
                            <div className={`rounded-2xl p-6 border transition-all ${fiscalData.reel.total <= fiscalData.micro.total ? "bg-emerald-900/10 border-emerald-500/50" : "bg-black/20 border-white/5"}`}>
                                <div className="text-center mb-6"><h4 className="font-black text-white uppercase">Régime Réel</h4></div>
                                <div className="space-y-4 text-center font-mono text-sm">
                                    <div className="flex justify-between md:justify-center items-center h-auto md:h-10 py-2 md:py-0 border-b border-white/5 md:border-none"><span className="md:hidden text-xs text-zinc-500">Recettes</span><span className="text-white">{formatEuro(Number(rent)*12)}</span></div>
                                    <div className="flex justify-between md:justify-center items-center h-auto md:h-10 py-2 md:py-0 border-b border-white/5 md:border-none"><span className="md:hidden text-xs text-zinc-500">Charges</span><span className="text-zinc-300">-{formatEuro(fiscalData.reel.charges)}</span></div>
                                    <div className="flex justify-between md:justify-center items-center h-auto md:h-10 py-2 md:py-0 border-b border-white/5 md:border-none"><span className="md:hidden text-xs text-blue-400">Intérêts</span><span className="text-blue-400 font-bold">-{formatEuro(Math.round(yearOneInterest))}</span></div>
                                    <div className="flex justify-between md:justify-center items-center h-auto md:h-10 py-2 md:py-0 border-b border-white/5 md:border-none"><span className="md:hidden text-xs text-indigo-400">Amortissement</span><span className="text-indigo-400 font-bold">-{formatEuro(Math.round(fiscalData.reel.amortissement))}</span></div>
                                    <div className="hidden md:block h-1 bg-white/5 my-2"></div>
                                    <div className="flex justify-between md:justify-center items-center h-auto md:h-10 py-2 md:py-0 border-b border-white/5 md:border-none"><span className="md:hidden text-xs text-white font-bold">Base Imp.</span><span className="text-white font-bold text-lg">{fiscalData.reel.base === 0 ? "0 €" : formatEuro(fiscalData.reel.base)}</span></div>
                                    <div className="flex justify-between md:justify-center items-center h-auto md:h-10 py-2 md:py-0"><span className="md:hidden text-xs text-amber-500 font-bold">Impôt Total</span><span className="text-amber-500 font-bold">{formatEuro(fiscalData.reel.total)}</span></div>
                                </div>
                            </div>
                        </div>
                    </PremiumCard>
                ) : (
                    // --- MODE PLUS-VALUE (RP / RS) ---
                    <PremiumCard color="emerald" className="p-10 bg-gradient-to-br from-[#0B0B0F] to-black border-emerald-500/20">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30"><TrendingUp size={24}/></div>
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Plus-Value <span className="text-emerald-500">Immobilière</span></h2>
                                <p className="text-zinc-400 text-sm">Simulation à la revente (Régime des particuliers 2026)</p>
                            </div>
                        </div>

                        {projectType === "RP" ? (
                            <div className="p-10 rounded-3xl bg-gradient-to-br from-amber-900/20 via-zinc-900 to-black border border-amber-500/30 text-center relative overflow-hidden shadow-[0_0_50px_-10px_rgba(245,158,11,0.2)]">
                                <div className="absolute top-0 right-0 p-32 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                                <div className="inline-flex p-4 rounded-full bg-amber-500/20 text-amber-400 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                                    <Crown size={40} />
                                </div>
                                <h3 className="text-3xl font-black text-white uppercase mb-4 tracking-wide">Le Graal Fiscal : <span className="text-amber-400">Exonération Totale</span></h3>
                                <p className="text-sm text-zinc-300 max-w-2xl mx-auto leading-relaxed mb-8">
                                    La plus-value sur Résidence Principale est <strong className="text-white">100% exonérée</strong> d'impôt et de prélèvements sociaux.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto text-left">
                                    <div className="bg-black/50 p-6 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-4"><p className="text-[10px] text-zinc-500 font-bold uppercase">Prix Revente Estimé</p></div>
                                        <Input type="number" value={resalePrice} onChange={e => handleInput(setResalePrice, e.target.value)} className="bg-transparent border-white/10 h-14 text-white font-black text-3xl px-0 focus-visible:ring-0 focus:border-amber-500"/>
                                    </div>
                                    <div className="bg-black/50 p-6 rounded-2xl border border-amber-500/20 relative overflow-hidden">
                                        <div className="absolute right-0 top-0 h-full w-2 bg-amber-500"></div>
                                        <p className="text-[10px] text-amber-500 font-bold uppercase mb-2">Net Vendeur (Gain Brut)</p>
                                        <p className="text-4xl font-black text-white">{formatEuro(Math.max(0, (Number(resalePrice)||0) - Number(price)))}</p>
                                        <p className="text-xs text-zinc-500 mt-2 font-bold flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500"/> 0€ d'impôt à payer</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="p-8 bg-zinc-900/50 rounded-3xl border border-white/5 space-y-6">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Paramètres de sortie</h4>
                                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Prix de Revente Estimé</label><Input type="number" value={resalePrice} onChange={e => handleInput(setResalePrice, e.target.value)} className="bg-black/40 border-white/10 h-14 text-white font-bold text-xl"/></div>
                                    <PremiumSlider label="Années de détention" value={holdingYears} min={1} max={35} step={1} unit="ans" onChange={setHoldingYears}/>
                                </div>
                                <div className="p-8 bg-zinc-900/50 rounded-3xl border border-white/5 flex flex-col justify-center">
                                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                                        <span className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">Base Acquisition</span>
                                        <span className="text-lg font-bold text-white">{formatEuro(capitalGainData.acquisitionPrice)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2"><span className="text-sm text-zinc-400">Plus-Value Brute</span><span className="text-xl font-bold text-white">{formatEuro(capitalGainData.grossGain)}</span></div>
                                    <div className="flex justify-between items-center mb-8"><span className="text-sm text-zinc-400 flex items-center gap-2">Impôt Total (IR + PS)</span><span className={`text-xl font-bold ${capitalGainData.totalTax > 0 ? "text-red-500" : "text-emerald-500"}`}>-{formatEuro(capitalGainData.totalTax)}</span></div>
                                    <div className="pt-6 border-t border-white/10"><span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 block mb-2">NET VENDEUR</span><span className="text-5xl font-black text-white tracking-tighter">{formatEuro(capitalGainData.netGain)}</span></div>
                                </div>
                            </div>
                        )}
                    </PremiumCard>
                )}
            </motion.div>
          )}

          {mode === "PROJETS" && (
            <motion.div key="list" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedSimulations.map((sim) => (
                    <PremiumCard key={sim.id} className="p-6 group flex flex-col justify-between h-full">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div><h4 className="text-lg font-bold text-white mb-1">{sim.name}</h4><span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded uppercase tracking-wider">{sim.data.projectType} • {sim.data.rentalStrategy}</span></div>
                                <p className="text-[10px] text-zinc-600 font-mono">{new Date(sim.date).toLocaleDateString()}</p>
                            </div>
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-end border-b border-white/5 pb-2"><span className="text-xs text-zinc-500 font-bold uppercase">Cashflow</span><span className={`text-xl font-black ${sim.data.cashflowNetImpots > 0 ? "text-emerald-400" : "text-rose-500"}`}>{Math.round(sim.data.cashflowNetImpots)}€</span></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <Button onClick={() => loadSimulation(sim)} className="flex-1 bg-white text-black hover:bg-zinc-200 h-10 rounded-xl text-xs font-bold uppercase shadow-lg"><MousePointerClick size={14} className="mr-2"/> Ouvrir</Button>
                                {/* BOUTON PDF */}
                                <Button onClick={() => prepareAndPrint(sim)} className="w-10 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 h-10 rounded-xl"><Printer size={14}/></Button>
                                <Button onClick={() => deleteSimulation(sim.id)} className="w-10 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 h-10 rounded-xl"><Trash2 size={14}/></Button>
                            </div>
                            <Button onClick={() => importToPatrimoine(sim)} disabled={importingId === sim.id} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-10 rounded-xl text-xs font-bold uppercase shadow-lg shadow-emerald-900/20 transition-all">{importingId === sim.id ? "..." : <><Check size={14} className="mr-2"/> Valider cet investissement</>}</Button>
                        </div>
                    </PremiumCard>
                ))}
            </motion.div>
          )}

          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}