"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber as formatPrice } from "@/lib/formatters";
import { 
    ArrowLeft, Printer, Settings2, Sparkles, MapPin, 
    Maximize, Grid, Layers, Leaf, Banknote, 
    Calculator, Smartphone, CheckCircle, Image as ImageIcon, MousePointerClick
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COLORS = {
    primary: "#8a0e01",
    secondary: "#d35f52",
    gray: "#393939",
    darkBg: "#0a0a0c",
};

const DPE_COLORS: Record<string, string> = { "A": "#00A06D", "B": "#52B153", "C": "#A5CC74", "D": "#F3E724", "E": "#F0B328", "F": "#EB8235", "G": "#D7221F" };

export default function PlaquetteManager() {
    const params = useParams();
    const router = useRouter();
    const estimationId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [baseData, setBaseData] = useState<any>(null);
    const [domain, setDomain] = useState("");

    // --- VARIABLES COMMERCIALES ---
    const [sellingPriceFAI, setSellingPriceFAI] = useState<number>(0);
    const [agencyFees, setAgencyFees] = useState<number>(0);
    const [feeType, setFeeType] = useState<"PERCENT" | "EUROS">("PERCENT");
    const [commercialText, setCommercialText] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            setDomain(window.location.origin);
        }
        if (!estimationId) return;
        const fetchEstimation = async () => {
            const { data } = await supabase.from('estimations').select('data_json').eq('id', estimationId).single();
            if (data && data.data_json) {
                setBaseData(data.data_json);
                setSellingPriceFAI(data.data_json.highPrice || 0);
                setCommercialText(data.data_json.features || "");
            }
            setLoading(false);
        };
        fetchEstimation();
    }, [estimationId]);

    // URLs interactives (Sécurisées pour ne s'activer que quand le domaine est connu)
    const photosUrl = domain ? `${domain}/galerie/${estimationId}` : "";
    const simulationUrl = domain ? `${domain}/simulation/${estimationId}?price=${sellingPriceFAI}` : "";

    const feeAmount = feeType === "PERCENT" ? (sellingPriceFAI * (agencyFees / 100)) : agencyFees;
    const netVendeur = Math.max(0, sellingPriceFAI - feeAmount);

    const getDynamicTitle = () => {
        if (!baseData) return "";
        let title = `${baseData.propertyType}`;
        if (baseData.rooms > 0) title += ` T${baseData.rooms}`;
        return title;
    };

    const getCleanAmenities = () => {
        if (!baseData) return [];
        const combined = [...(baseData.strengths || []), ...(baseData.amenities || [])];
        return combined.filter((item, index) => {
            return combined.findIndex(t => t.trim().toLowerCase() === item.trim().toLowerCase()) === index;
        });
    };

    const renderLargeEnergyScale = (currentLetter: string, title: string, subtitle: string) => (
        <div className="flex-1 bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">{title}</p>
                    <p className="text-[9px] text-zinc-500 font-medium">{subtitle}</p>
                </div>
                <div className="text-5xl font-black" style={{ color: DPE_COLORS[currentLetter] || COLORS.gray }}>{currentLetter}</div>
            </div>
            <div className="flex items-end h-20 gap-1.5">
                {["A","B","C","D","E","F","G"].map((letter, index) => {
                    const isSelected = currentLetter === letter;
                    const height = 100 - (index * 8); 
                    return (
                        <div key={letter} className="flex-1 flex flex-col items-center gap-2">
                            <div 
                                className={`w-full rounded-t-lg transition-all duration-500 ${isSelected ? 'h-20 shadow-lg border-2 border-white' : 'h-10 opacity-20'}`}
                                style={{ 
                                    backgroundColor: DPE_COLORS[letter],
                                    height: isSelected ? '80px' : `${height / 2}px`
                                }}
                            />
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-zinc-800' : 'text-zinc-300'}`}>{letter}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (loading) return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white font-sans">Chargement...</div>;

    return (
        <div className="min-h-screen font-sans pb-32" style={{ backgroundColor: '#e8e8ec' }}>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;700&display=swap');
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; }
                    .print-hidden { display: none !important; }
                    .print-page { width: 210mm !important; height: 297mm !important; page-break-after: always !important; box-shadow: none !important; margin: 0 !important; overflow: hidden; }
                    /* Sécurisation absolue des liens PDF */
                    a { text-decoration: none !important; color: inherit !important; display: block !important; }
                }
                .font-serif { font-family: 'Playfair Display', serif; }
            `}</style>

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 text-white px-8 py-4 rounded-full flex items-center gap-5 shadow-2xl z-50 print-hidden border bg-[#0a0a0c]/95 backdrop-blur-md">
                <Button variant="ghost" onClick={() => router.back()} className="text-zinc-400 hover:text-white rounded-full text-sm"><ArrowLeft size={15} className="mr-2"/> Retour</Button>
                <div className="w-px h-5 bg-white/10"></div>
                <span className="text-xs font-bold text-white px-4 tracking-widest uppercase">Brochure Commerciale (2 pages)</span>
                <div className="w-px h-5 bg-white/10"></div>
                <Button onClick={() => window.print()} className="rounded-full px-7 h-10 font-bold text-sm bg-gradient-to-r from-[#8a0e01] to-[#d35f52]"><Printer size={15} className="mr-2"/> Imprimer PDF</Button>
            </div>

            <div className="bg-[#0a0a0c] text-white pt-8 pb-12 px-6 shadow-xl print-hidden mb-12 border-b border-white/10">
                <div className="max-w-6xl mx-auto grid grid-cols-3 gap-8">
                    <div className="col-span-1 space-y-4">
                        <h3 className="text-[11px] uppercase tracking-widest font-bold text-[#d35f52] flex items-center gap-2"><MapPin size={14}/> Transaction</h3>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Prix Affiché FAI</label>
                            <Input type="number" value={sellingPriceFAI||""} onChange={e=>setSellingPriceFAI(Number(e.target.value))} className="h-10 bg-black/50 border-white/10 text-sm font-bold focus:border-[#d35f52]"/>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Honoraires Agence</label>
                                <div className="flex bg-white/10 rounded overflow-hidden">
                                    <button onClick={()=>setFeeType("PERCENT")} className={`text-[9px] px-2 py-1 font-bold ${feeType==="PERCENT"?'bg-white text-black':'text-zinc-400'}`}>%</button>
                                    <button onClick={()=>setFeeType("EUROS")} className={`text-[9px] px-2 py-1 font-bold ${feeType==="EUROS"?'bg-white text-black':'text-zinc-400'}`}>€</button>
                                </div>
                            </div>
                            <Input type="number" value={agencyFees||""} onChange={e=>setAgencyFees(Number(e.target.value))} className="h-10 bg-black/50 border-white/10 text-sm"/>
                        </div>
                    </div>
                    <div className="col-span-2 space-y-2 border-l border-white/10 pl-8">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-[#d35f52] flex items-center gap-2 mb-2"><Sparkles size={14}/> Accroche Commerciale</label>
                        <textarea value={commercialText} onChange={e=>setCommercialText(e.target.value)} className="w-full h-36 bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-zinc-200 outline-none focus:border-[#d35f52] resize-none leading-relaxed" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center gap-10">
                {/* PAGE 1 */}
                <div className="print-page w-[210mm] h-[297mm] bg-white shadow-2xl relative flex flex-col">
                    <div className="relative w-full h-[45%]">
                        <img src={baseData.mainPhoto} className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
                        <div className="absolute top-8 left-8 bg-white p-3.5 rounded-2xl shadow-xl"><img src="/logo-patrim.png" alt="PATRIM" className="h-8 object-contain"/></div>
                        <div className="absolute top-8 right-8"><span className="bg-[#8a0e01] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-lg border border-white/20">À la Vente</span></div>
                        <div className="absolute bottom-10 left-10 text-white right-10">
                            <h1 className="font-serif text-5xl font-bold tracking-tight mb-2 uppercase">{getDynamicTitle()}</h1>
                            <p className="text-lg font-medium opacity-90 flex items-center gap-2"><MapPin size={18} className="text-[#d35f52]"/> {baseData.propertyAddress}</p>
                        </div>
                    </div>
                    
                    <div className="relative -mt-8 mx-10 bg-white rounded-2xl shadow-xl flex overflow-hidden border border-zinc-100 z-10">
                        <div className="w-2" style={{ background: `linear-gradient(to bottom, ${COLORS.primary}, ${COLORS.secondary})` }}></div>
                        <div className="flex-1 py-5 px-8 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Prix de présentation</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-serif text-4xl font-black" style={{ color: COLORS.gray }}>{formatPrice(sellingPriceFAI)}</span>
                                    <span className="text-xl font-bold" style={{ color: COLORS.primary }}>€ <span className="text-[11px] font-sans text-zinc-400">FAI</span></span>
                                </div>
                                <p className="text-[9px] font-bold text-zinc-500 mt-1">
                                    Prix net vendeur : {formatPrice(netVendeur)} € plus {feeType === "PERCENT" ? agencyFees + "%" : formatPrice(feeAmount)+" €"} d'honoraires à charge acquéreur.
                                </p>
                            </div>
                            <span className="text-xs font-bold text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">{Math.round(sellingPriceFAI / (baseData.surface || 1))} € / m²</span>
                        </div>
                    </div>

                    <div className="flex-1 px-10 py-8 flex flex-col justify-center">
                        <div className="grid grid-cols-4 gap-4 mb-10">
                            {[{ icon: <Maximize size={16}/>, label: "Surface", value: `${baseData.surface} m²` }, { icon: <Grid size={16}/>, label: "Pièces", value: `${baseData.rooms} pces` }, { icon: <Layers size={16}/>, label: "Étage", value: baseData.floor || "RDC" }, { icon: <Leaf size={16}/>, label: "DPE", value: `Classe ${baseData.dpe}` }].map((item, idx) => (
                                <div key={idx} className="bg-[#f8f8f9] rounded-[14px] p-4 flex flex-col items-center justify-center text-center border border-zinc-100">
                                    <div className="w-8 h-8 rounded-full mb-2 flex items-center justify-center" style={{ backgroundColor: `${COLORS.secondary}15`, color: COLORS.secondary }}>{item.icon}</div>
                                    <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 mb-1">{item.label}</p>
                                    <p className="text-base font-black text-zinc-800">{item.value}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-[11px] uppercase tracking-[0.2em] font-black mb-4 flex items-center gap-2" style={{ color: COLORS.primary }}><span className="w-4 h-px bg-[#8a0e01]"></span> Description</h3>
                            <p className="text-[13px] text-zinc-600 leading-relaxed whitespace-pre-wrap font-medium text-justify">{commercialText}</p>
                        </div>
                    </div>
                    <div className="h-[20px] bg-[#0a0a0c] w-full"></div>
                </div>

                {/* PAGE 2 */}
                <div className="print-page w-[210mm] h-[297mm] bg-[#f8f8f9] shadow-2xl relative flex flex-col p-12">
                    <div className="flex justify-between items-end border-b-2 border-zinc-200 pb-5 mb-8">
                        <div>
                            <h2 className="font-serif text-3xl font-black text-zinc-800">Dossier Technique & Interactif</h2>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mt-1">{baseData.propertyAddress}</p>
                        </div>
                        <img src="/logo-patrim.png" alt="PATRIM" className="h-8 object-contain"/>
                    </div>

                    <div className="flex gap-6 mb-10">
                        {/* SECTION QR CODES - RENDUS CLIQUABLES POUR LE PDF */}
                        <div className="w-[55%] grid grid-cols-2 gap-5">
                            
                            <a href={photosUrl} target="_blank" rel="noopener noreferrer" className="block bg-white rounded-[32px] p-6 border border-zinc-100 shadow-lg flex flex-col items-center text-center relative overflow-hidden group hover:border-[#d35f52] transition-colors cursor-pointer">
                                <span className="opacity-0 absolute text-[1px]">{photosUrl}</span>
                                <div className="absolute inset-x-0 top-0 h-1.5 bg-[#d35f52]"></div>
                                <div className="bg-zinc-50 p-3 rounded-2xl mb-4 border border-zinc-50 shadow-inner group-hover:scale-105 transition-transform">
                                    {/* L'ajout de &margin=1 force la création d'un QR code propre sans utiliser de cache erroné */}
                                    {domain && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(photosUrl)}&margin=1`} alt="QR Photos" className="w-24 h-24"/>}
                                </div>
                                <h3 className="text-sm font-black text-zinc-800 mb-1 uppercase tracking-tighter">Galerie Photos</h3>
                                <p className="text-[10px] text-zinc-400 leading-tight">Cliquez ou flashez pour visiter</p>
                            </a>

                            <a href={simulationUrl} target="_blank" rel="noopener noreferrer" className="block bg-white rounded-[32px] p-6 border border-zinc-100 shadow-lg flex flex-col items-center text-center relative overflow-hidden group hover:border-[#8a0e01] transition-colors cursor-pointer">
                                <span className="opacity-0 absolute text-[1px]">{simulationUrl}</span>
                                <div className="absolute inset-x-0 top-0 h-1.5 bg-[#8a0e01]"></div>
                                <div className="bg-zinc-50 p-3 rounded-2xl mb-4 border border-zinc-50 shadow-inner group-hover:scale-105 transition-transform">
                                    {domain && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(simulationUrl)}&margin=1`} alt="QR Simulation" className="w-24 h-24"/>}
                                </div>
                                <h3 className="text-sm font-black text-zinc-800 mb-1 uppercase tracking-tighter">Simulateur de Prêt</h3>
                                <p className="text-[10px] text-zinc-400 leading-tight">Possibilité de simulation de rentabilité</p>
                            </a>
                            
                            <div className="col-span-2 flex items-center justify-center gap-3 text-[#8a0e01] font-black text-[10px] uppercase tracking-[0.2em] bg-white py-3 rounded-2xl border border-zinc-100 shadow-sm">
                                <MousePointerClick size={16}/> Cliquez sur les blocs ou utilisez un smartphone
                            </div>
                        </div>

                        {/* COÛTS & EQUIPEMENTS */}
                        <div className="w-[45%] flex flex-col gap-5">
                            <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-md">
                                <h3 className="text-[10px] uppercase tracking-widest font-black flex items-center gap-2 mb-4 text-[#8a0e01]"><Banknote size={14}/> Coûts Annuels</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs border-b border-zinc-50 pb-2"><span className="text-zinc-400 font-bold">Taxe Foncière</span><span className="font-black text-[#393939]">{formatPrice(baseData.taxeFonciere)} €</span></div>
                                    <div className="flex justify-between items-center text-xs"><span className="text-zinc-400 font-bold">Copropriété</span><span className="font-black text-[#393939]">{baseData.isCopropriete ? formatPrice(baseData.coproFees * 12) + " €" : "N/A"}</span></div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-md flex-1">
                                <h3 className="text-[10px] uppercase tracking-widest font-black flex items-center gap-2 mb-4 text-zinc-400"><Layers size={14}/> Équipements</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {getCleanAmenities().map((item:any, i:number) => (
                                        <span key={i} className="text-[9px] font-bold px-2.5 py-1 bg-zinc-50 text-zinc-600 rounded-lg border border-zinc-100 uppercase tracking-tighter"> {item} </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BILAN ÉNERGÉTIQUE */}
                    <div className="mt-auto flex flex-col gap-6">
                        <h3 className="text-[11px] uppercase tracking-[0.3em] font-black text-center text-zinc-300 flex items-center justify-center gap-5">
                            <div className="h-px flex-1 bg-zinc-100"></div> Bilan Énergétique <div className="h-px flex-1 bg-zinc-100"></div>
                        </h3>
                        <div className="flex gap-6">
                            {renderLargeEnergyScale(baseData.dpe, "DPE — Consommation", "kWh/m²/an")}
                            {renderLargeEnergyScale(baseData.ges, "GES — Émissions", "kg CO2/m²/an")}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}