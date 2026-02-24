"use client";

import { useState, useRef, useEffect } from "react";
import { toPng } from 'html-to-image';
import { Download, Sparkles, Copy, Loader2, Linkedin, LayoutTemplate, BookOpen, GraduationCap, Calculator, TrendingUp, Quote, UploadCloud, CheckCircle2, FileText, Edit3, Wand2, Palette, Layers, ChevronLeft, ChevronRight, Square, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { NexusLogo } from "@/components/NexusLogo";
import { AreaChart, Area, ResponsiveContainer, CartesianGrid, XAxis, Tooltip } from "recharts";
import { Switch } from "@/components/ui/switch";

// --- SÉCURITÉ ---
const ADMIN_ID = ""; 

// --- PALETTES FINTECH ---
const THEMES: any = {
    emerald: { name: "Bull Market", text: "text-emerald-400", bg: "bg-emerald-500", border: "border-emerald-500/30", stroke: "#34d399", gradient: "from-emerald-500/20" },
    amber:   { name: "Gold Standard", text: "text-amber-400", bg: "bg-amber-500", border: "border-amber-500/30", stroke: "#fbbf24", gradient: "from-amber-500/20" },
    indigo:  { name: "Deep Tech", text: "text-indigo-400", bg: "bg-indigo-500", border: "border-indigo-500/30", stroke: "#818cf8", gradient: "from-indigo-500/20" },
    cyan:    { name: "Future Blue", text: "text-cyan-400", bg: "bg-cyan-500", border: "border-cyan-500/30", stroke: "#22d3ee", gradient: "from-cyan-500/20" },
    rose:    { name: "Red Alert", text: "text-rose-400", bg: "bg-rose-500", border: "border-rose-500/30", stroke: "#fb7185", gradient: "from-rose-500/20" },
};

export default function NexusStudio() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("generator");
  
  // Format et Pagination Carrousel
  const [format, setFormat] = useState<"SINGLE" | "CAROUSEL">("CAROUSEL");
  const [currentPage, setCurrentPage] = useState(0);

  // Inputs Génération
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [themeType, setThemeType] = useState("fiscalite"); // Pour le prompt IA
  const [pdfText, setPdfText] = useState("");
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Customisation Visuelle
  const [selectedColor, setSelectedColor] = useState<string>("amber");
  const [showNoise, setShowNoise] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [glassEffect, setGlassEffect] = useState(true);

  // Data & Content
  const [postContent, setPostContent] = useState("");
  const [data, setData] = useState<any>({
    header_title: "LE PIÈGE DU LIVRET A",
    header_tag: "ÉDUCATION FINANCIÈRE",
    kpi_1_value: "3%", kpi_1_label: "Inflation",
    kpi_2_value: "22 950€", kpi_2_label: "Plafond",
    kpi_3_value: "0%", kpi_3_label: "Fiscalité",
    intro_title: "DÉFINITION & CONTEXTE",
    intro_text: "Le Livret A est un produit d'épargne réglementé par l'État français. Son taux est calculé deux fois par an selon une formule mathématique liée à l'inflation. Bien que le capital soit garanti, son rendement réel est souvent négatif sur le long terme.",
    analysis_title: "MÉCANIQUE FINANCIÈRE",
    analysis_points: [
        "Un plafond strict de 22 950 € empêchant l'effet boule de neige.",
        "Un taux d'intérêt souvent inférieur à l'inflation réelle du coût de la vie.",
        "Une liquidité immédiate qui encourage la dépense plutôt que l'investissement."
    ],
    example_title: "LA RÉALITÉ CHIFFRÉE",
    example_text: "Si vous aviez placé 10 000 € sur un Livret A en 2010, vous auriez environ 12 500 € aujourd'hui. Avec l'inflation cumulée de 25% sur la période, votre pouvoir d'achat réel est resté strictement identique.",
    show_chart: true,
    chart_title: "Livret A vs S&P 500 (Base 100)",
    chart_data: [
        { name: 'Start', value1: 100, value2: 100 },
        { name: 'Y2', value1: 102, value2: 120 },
        { name: 'Y5', value1: 105, value2: 180 },
        { name: 'Y10', value1: 115, value2: 280 },
    ],
    chart_legend: ["Livret A", "Actions Monde"],
    footer_conclusion: "La sécurité a un prix : c'est le coût d'opportunité de ne pas s'enrichir."
  });

  const visualRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!ADMIN_ID || (session && session.user.id === ADMIN_ID)) setAuthorized(true);
        setLoading(false);
    };
    checkAuth();
  }, []);

  // --- PDF ---
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReadingPdf(true);
    setPdfText(""); 
    try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        const maxPages = Math.min(pdf.numPages, 8); 
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n";
        }
        setPdfText(fullText);
    } catch (err) { alert("Erreur lecture PDF"); } finally { setIsReadingPdf(false); }
  };

  // --- IA ---
  const generateContent = async () => {
    if (!topic) return;
    setIsGenerating(true);
    try {
        const res = await fetch('/api/social-ai', {
            method: 'POST',
            body: JSON.stringify({ topic, theme: themeType, context, pdfSource: pdfText })
        });
        const resJson = await res.json();
        setPostContent(resJson.linkedin_post);
        setData(resJson.visual);
        setActiveTab("editor"); 
        setCurrentPage(0); // Reset page
        
        // Auto-select color based on theme
        if (themeType === 'bourse') setSelectedColor('emerald');
        else if (themeType === 'fiscalite') setSelectedColor('amber');
        else setSelectedColor('indigo');

    } catch (e) { alert("Erreur IA"); } finally { setIsGenerating(false); }
  };

  // --- HELPER POUR ÉDITION ---
  const updateData = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };
  
  const updateChartData = (index: number, key: string, value: any) => {
      const newData = data.chart_data.map((item: any, i: number) => {
          if (i === index) {
              return { ...item, [key]: value }; 
          }
          return item;
      });
      updateData('chart_data', newData);
  };

  const updateAnalysisPoint = (index: number, value: string) => {
      const newPoints = [...data.analysis_points];
      newPoints[index] = value;
      updateData('analysis_points', newPoints);
  };

  // --- TÉLÉCHARGEMENT MULTIPLE ---
  const downloadImage = async () => {
    const pagesToDownload = format === "SINGLE" ? [0] : [0, 1, 2, 3];
    
    for (const pageIndex of pagesToDownload) {
        const ref = visualRefs.current[pageIndex];
        if (ref) {
            await new Promise(r => setTimeout(r, 200)); // Petit délai pour laisser le rendu se faire
            const dataUrl = await toPng(ref, { cacheBust: true, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = format === "SINGLE" ? `nexus-post-${Date.now()}.png` : `nexus-slide-${pageIndex + 1}.png`;
            link.href = dataUrl;
            link.click();
        }
    }
  };

  const copyPost = () => { navigator.clipboard.writeText(postContent); alert("Post copié !"); };

  // Styles Dynamiques
  const T = THEMES[selectedColor]; // Thème actif

  // --- RENDU D'UNE PAGE (Fonction pour gérer le carrousel) ---
  const renderVisualPage = (pageIndex: number, isHidden: boolean = false) => {
    const isSingle = format === "SINGLE";
    
    return (
        <div 
            ref={el => { visualRefs.current[pageIndex] = el }}
            className={`
                ${isHidden ? 'fixed -left-[9999px]' : 'relative'} 
                w-[540px] 
                ${isSingle ? 'min-h-[675px] h-auto pb-12' : 'h-[540px]'} 
                bg-[#08080A] flex flex-col shrink-0 shadow-2xl border border-white/10 font-sans overflow-hidden transition-all duration-300
            `}
        >
            {/* FONDS & TEXTURES */}
            {showNoise && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0"></div>}
            {showGrid && <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>}
            
            {/* EN-TÊTE GLOBAL */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-b from-white/5 to-transparent border-b border-white/5 relative z-10 shrink-0">
                <div className={`absolute top-0 right-0 w-[300px] h-[300px] ${T.bg} blur-[120px] opacity-20 pointer-events-none`}></div>
                
                {/* CORRECTION DU CHEVAUCHEMENT : Flex-col sur la partie droite */}
                <div className="flex justify-between items-start mb-4">
                    {/* Gauche : Tag */}
                    <div className="flex flex-col items-start justify-center">
                        <div className={`px-3 py-1 rounded-md border border-white/10 bg-black/40 text-[9px] font-bold uppercase tracking-widest ${T.text}`}>{data.header_tag}</div>
                    </div>
                    
                    {/* Droite : Logo + PageNum empilés */}
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 opacity-90">
                            <div className="w-5 h-5 text-white"><NexusLogo className="w-full h-full"/></div>
                            <span className="text-sm font-black text-white tracking-tighter uppercase">NEXUS</span>
                        </div>
                        {!isSingle && (
                            <div className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded border border-white/5">
                                {pageIndex + 1} / 4
                            </div>
                        )}
                    </div>
                </div>
                
                {/* TITRE (Seulement sur page 1 en carrousel, ou tout le temps en single) */}
                {(isSingle || pageIndex === 0) && (
                    <h2 className={`${isSingle ? 'text-3xl' : 'text-4xl'} font-black text-white leading-tight uppercase tracking-tight`}>{data.header_title}</h2>
                )}
            </div>

            {/* CORPS DE PAGE */}
            <div className="flex-1 px-8 py-6 relative z-10 flex flex-col justify-center">
                
                {/* PAGE 1 : KPIs */}
                {(isSingle || pageIndex === 0) && (
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        {[{ val: data.kpi_1_value, lab: data.kpi_1_label }, { val: data.kpi_2_value, lab: data.kpi_2_label }, { val: data.kpi_3_value, lab: data.kpi_3_label }].map((k, i) => (
                            <div key={i} className={`bg-white/5 rounded-lg p-2 text-center border ${glassEffect ? 'backdrop-blur-md border-white/10' : 'border-white/5'}`}>
                                <p className={`text-lg font-black ${T.text}`}>{k.val}</p>
                                <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">{k.lab}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* PAGE 2 : ANALYSE (Intro + Points) */}
                {(isSingle || pageIndex === 1) && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><BookOpen size={12}/> {data.intro_title}</h3>
                            <p className="text-xs text-zinc-200 leading-relaxed font-medium text-justify border-l-2 border-white/20 pl-3">{data.intro_text}</p>
                        </div>
                        <div className="space-y-2">
                            <h3 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${T.text}`}><GraduationCap size={12}/> {data.analysis_title}</h3>
                            <div className={`bg-white/5 border rounded-xl p-4 space-y-3 ${glassEffect ? 'backdrop-blur-sm border-white/10' : 'border-white/5'}`}>
                                {data.analysis_points?.map((pt: string, i: number) => (
                                    <div key={i} className="flex items-start gap-3"><div className={`w-1 h-1 rounded-full ${T.bg} mt-1.5 shrink-0`}></div><p className="text-[11px] text-zinc-300 leading-snug">{pt}</p></div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* PAGE 3 : PREUVE (Exemple + Chart) */}
                {(isSingle || pageIndex === 2) && (
                    <div className="space-y-4 h-full flex flex-col justify-center">
                        <div className={`bg-zinc-900/50 border rounded-xl p-4 flex flex-col justify-start ${glassEffect ? 'backdrop-blur-sm border-white/10' : 'border-white/5'}`}>
                            <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-2"><Calculator size={10}/> {data.example_title}</h3>
                            <p className="text-[10px] text-zinc-300 leading-relaxed italic">"{data.example_text}"</p>
                        </div>

                        {data.show_chart && (
                            <div className={`bg-zinc-900/50 border rounded-xl p-4 flex flex-col relative overflow-hidden ${glassEffect ? 'backdrop-blur-sm border-white/10' : 'border-white/5'} ${isSingle ? 'h-[200px]' : 'flex-1'}`}>
                                <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 truncate flex items-center gap-2"><TrendingUp size={10}/> {data.chart_title}</h3>
                                <div className="flex-1 w-full min-h-0 -ml-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.chart_data}>
                                            <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.stroke} stopOpacity={0.3}/><stop offset="95%" stopColor={T.stroke} stopOpacity={0}/></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                            <XAxis dataKey="name" stroke="#52525b" fontSize={8} tickLine={false} axisLine={false} />
                                            <Area type="monotone" dataKey="value1" stroke={T.stroke} strokeWidth={3} fill="url(#grad)" dot={false} />
                                            {data.chart_data[0].value2 && <Area type="monotone" dataKey="value2" stroke="#52525b" strokeWidth={2} strokeDasharray="4 4" fill="transparent" dot={false} />}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="absolute bottom-2 right-2 flex gap-3">
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full" style={{background: T.stroke}}></div><span className="text-[7px] text-white uppercase font-bold tracking-wider">{data.chart_legend?.[0]}</span></div>
                                    {data.chart_legend?.[1] && <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full bg-zinc-600"></div><span className="text-[7px] text-zinc-500 uppercase font-bold tracking-wider">{data.chart_legend[1]}</span></div>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* PAGE 4 : CONCLUSION */}
                {(isSingle || pageIndex === 3) && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                        <Quote size={40} className={`shrink-0 ${T.text} opacity-50`} />
                        <p className="text-xl font-bold text-white leading-snug italic px-4">"{data.footer_conclusion}"</p>
                        <div className={`mt-8 px-6 py-3 rounded-full border ${T.border} ${T.text} font-bold text-xs uppercase tracking-widest`}>
                            Téléchargez Nexus
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER (Seulement en Single) */}
            {(isSingle) && (
                <div className="px-8 pt-4 pb-0 bg-black relative z-10 border-t border-white/5 mt-auto">
                    <div className="flex gap-3 items-start">
                        <Quote size={24} className={`shrink-0 ${T.text} opacity-50`} />
                        <p className="text-sm font-bold text-white leading-snug italic">{data.footer_conclusion}</p>
                    </div>
                </div>
            )}
        </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-black" />;
  if (!authorized) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-800 font-black text-4xl">403</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 p-4 md:p-8 font-sans flex flex-col xl:flex-row gap-8 md:gap-12">
      
      {/* --- COLONNE GAUCHE : COMMANDES --- */}
      <div className="w-full xl:w-1/3 flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 mb-6 shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white"><LayoutTemplate size={20}/></div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Nexus <span className="text-indigo-500">Studio</span></h1>
        </div>

        {/* --- ONGLETS (IA vs EDITOR) --- */}
        <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl mb-6 shrink-0">
            <button onClick={() => setActiveTab("generator")} className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === "generator" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}><Wand2 size={14} className="inline mr-2"/> Générateur</button>
            <button onClick={() => setActiveTab("editor")} className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === "editor" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}><Edit3 size={14} className="inline mr-2"/> Éditeur</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-hide">
            
            {/* MODE GÉNÉRATEUR */}
            {activeTab === "generator" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                    <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 space-y-4">
                        
                        {/* SÉLECTEUR DE FORMAT */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button onClick={() => setFormat("SINGLE")} className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs transition-all ${format === "SINGLE" ? "bg-white text-black border-white" : "bg-black/40 text-zinc-500 border-white/10"}`}>
                                <Smartphone size={16}/> Mode Unique
                            </button>
                            <button onClick={() => setFormat("CAROUSEL")} className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs transition-all ${format === "CAROUSEL" ? "bg-white text-black border-white" : "bg-black/40 text-zinc-500 border-white/10"}`}>
                                <Square size={16}/> Mode Carrousel
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-2"><UploadCloud size={12}/> Source PDF</label>
                            <div onClick={() => fileInputRef.current?.click()} className={`h-14 border border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-all ${pdfText ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/20 hover:border-white/40 hover:bg-white/5"}`}>
                                <input type="file" ref={fileInputRef} onChange={handlePdfUpload} accept="application/pdf" className="hidden" />
                                {isReadingPdf ? <span className="text-xs text-zinc-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Lecture...</span> : pdfText ? <span className="text-xs text-emerald-400 font-bold flex items-center gap-2"><CheckCircle2 size={14}/> PDF Chargé</span> : <span className="text-xs text-zinc-500">Glisser un fichier</span>}
                            </div>
                        </div>
                        <div className="space-y-2"><label className="text-xs font-bold text-zinc-500 uppercase">Sujet</label><Input value={topic} onChange={(e) => setTopic(e.target.value)} className="bg-black border-white/10"/></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-zinc-500 uppercase">Infos Clés (Prompt)</label><Textarea value={context} onChange={(e) => setContext(e.target.value)} className="bg-black border-white/10 min-h-[80px] text-xs"/></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-zinc-500 uppercase">Thème</label><Select value={themeType} onValueChange={setThemeType}><SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-900 border-white/10 text-white"><SelectItem value="fiscalite">Fiscalité</SelectItem><SelectItem value="bourse">Bourse</SelectItem><SelectItem value="budget">Budget</SelectItem></SelectContent></Select></div>
                        <Button onClick={generateContent} disabled={isGenerating} className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-12 rounded-xl">{isGenerating ? <Loader2 className="animate-spin mr-2"/> : <Sparkles className="mr-2"/>} Générer</Button>
                    </div>
                    
                    <div className="space-y-2"><div className="flex justify-between items-center"><label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2"><Linkedin size={14}/> Post LinkedIn</label><Button variant="ghost" size="sm" onClick={copyPost} className="h-6 text-xs hover:bg-white/10"><Copy size={12} className="mr-1"/> Copier</Button></div><Textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} className="bg-zinc-900/50 border-white/10 min-h-[300px] text-sm leading-relaxed"/></div>
                </div>
            )}

            {/* MODE ÉDITEUR */}
            {activeTab === "editor" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 pb-20">
                    
                    {/* PALETTE DE COULEURS */}
                    <div className="space-y-3 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2"><Palette size={12}/> Ambiance Fintech</label>
                        <div className="flex justify-between gap-2">
                            {Object.entries(THEMES).map(([key, theme]: any) => (
                                <button key={key} onClick={() => setSelectedColor(key)} className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === key ? "border-white scale-110" : "border-transparent hover:scale-105"}`} style={{ backgroundColor: theme.stroke }} title={theme.name}></button>
                            ))}
                        </div>
                    </div>

                    {/* MODULES VISUELS */}
                    <div className="space-y-3 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2"><Layers size={12}/> Modules Visuels</label>
                        <div className="flex items-center justify-between"><span className="text-xs">Effet Grain (Noise)</span><Switch checked={showNoise} onCheckedChange={setShowNoise} /></div>
                        <div className="flex items-center justify-between"><span className="text-xs">Grille de Fond</span><Switch checked={showGrid} onCheckedChange={setShowGrid} /></div>
                        <div className="flex items-center justify-between"><span className="text-xs">Effet Glass</span><Switch checked={glassEffect} onCheckedChange={setGlassEffect} /></div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <h3 className="text-xs font-black text-white uppercase bg-zinc-800 px-3 py-1 rounded w-fit">En-tête</h3>
                        <div className="space-y-2"><label className="text-[10px] text-zinc-500 uppercase font-bold">Titre Principal</label><Input value={data.header_title} onChange={(e) => updateData('header_title', e.target.value)} className="bg-zinc-900 border-white/10"/></div>
                        <div className="space-y-2"><label className="text-[10px] text-zinc-500 uppercase font-bold">Tag</label><Input value={data.header_tag} onChange={(e) => updateData('header_tag', e.target.value)} className="bg-zinc-900 border-white/10"/></div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-white uppercase bg-zinc-800 px-3 py-1 rounded w-fit">KPIs</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1"><Input value={data.kpi_1_value} onChange={(e) => updateData('kpi_1_value', e.target.value)} className="bg-zinc-900 border-white/10 text-xs font-bold"/><Input value={data.kpi_1_label} onChange={(e) => updateData('kpi_1_label', e.target.value)} className="bg-zinc-900 border-white/10 text-[10px]"/></div>
                            <div className="space-y-1"><Input value={data.kpi_2_value} onChange={(e) => updateData('kpi_2_value', e.target.value)} className="bg-zinc-900 border-white/10 text-xs font-bold"/><Input value={data.kpi_2_label} onChange={(e) => updateData('kpi_2_label', e.target.value)} className="bg-zinc-900 border-white/10 text-[10px]"/></div>
                            <div className="space-y-1"><Input value={data.kpi_3_value} onChange={(e) => updateData('kpi_3_value', e.target.value)} className="bg-zinc-900 border-white/10 text-xs font-bold"/><Input value={data.kpi_3_label} onChange={(e) => updateData('kpi_3_label', e.target.value)} className="bg-zinc-900 border-white/10 text-[10px]"/></div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-white uppercase bg-zinc-800 px-3 py-1 rounded w-fit">Contenu</h3>
                        <div className="space-y-2"><label className="text-[10px] text-zinc-500 uppercase font-bold">Titre Intro</label><Input value={data.intro_title} onChange={(e) => updateData('intro_title', e.target.value)} className="bg-zinc-900 border-white/10"/></div>
                        <div className="space-y-2"><label className="text-[10px] text-zinc-500 uppercase font-bold">Texte Intro</label><Textarea value={data.intro_text} onChange={(e) => updateData('intro_text', e.target.value)} className="bg-zinc-900 border-white/10 text-xs min-h-[100px]"/></div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Points Clés</label>
                            {data.analysis_points.map((pt: string, i: number) => (
                                <Textarea key={i} value={pt} onChange={(e) => updateAnalysisPoint(i, e.target.value)} className="bg-zinc-900 border-white/10 text-xs min-h-[60px] mb-2"/>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-white uppercase bg-zinc-800 px-3 py-1 rounded w-fit">Exemple & Chart</h3>
                        <div className="space-y-2"><label className="text-[10px] text-zinc-500 uppercase font-bold">Titre Exemple</label><Input value={data.example_title} onChange={(e) => updateData('example_title', e.target.value)} className="bg-zinc-900 border-white/10"/></div>
                        <div className="space-y-2"><label className="text-[10px] text-zinc-500 uppercase font-bold">Texte Exemple</label><Textarea value={data.example_text} onChange={(e) => updateData('example_text', e.target.value)} className="bg-zinc-900 border-white/10 text-xs min-h-[80px]"/></div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <label className="text-xs font-bold">Afficher Graphique</label>
                            <Switch checked={data.show_chart} onCheckedChange={(c) => updateData('show_chart', c)} />
                        </div>

                        {data.show_chart && (
                            <div className="space-y-2 bg-black/20 p-2 rounded">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Données Graphiques (BUG FIX)</label>
                                {data.chart_data.map((pt: any, i: number) => (
                                    <div key={i} className="flex gap-2">
                                        <Input value={pt.name} onChange={(e) => updateChartData(i, 'name', e.target.value)} className="w-16 bg-zinc-900 border-white/10 text-xs"/>
                                        <Input type="number" value={pt.value1} onChange={(e) => updateChartData(i, 'value1', Number(e.target.value))} className="bg-zinc-900 border-white/10 text-xs"/>
                                        <Input type="number" value={pt.value2} onChange={(e) => updateChartData(i, 'value2', Number(e.target.value))} className="bg-zinc-900 border-white/10 text-xs"/>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xs font-black text-white uppercase bg-zinc-800 px-3 py-1 rounded w-fit">Pied de Page</h3>
                        <Textarea value={data.footer_conclusion} onChange={(e) => updateData('footer_conclusion', e.target.value)} className="bg-zinc-900 border-white/10 text-xs min-h-[60px]"/>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- DROITE : VISUALISATION --- */}
      <div className="flex-1 bg-[#0A0A0C] rounded-[40px] border border-white/5 p-4 md:p-12 flex flex-col items-center justify-center relative overflow-y-auto max-h-screen">
        
        {/* CAROUSEL LOGIC */}
        {format === "CAROUSEL" ? (
            <div className="flex flex-col items-center gap-8">
                {/* Navigation du Carrousel */}
                <div className="relative flex items-center group">
                    <button onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} className="absolute -left-12 md:-left-16 top-1/2 -translate-y-1/2 p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all z-50 text-white"><ChevronLeft/></button>
                    {renderVisualPage(currentPage)}
                    <button onClick={() => setCurrentPage(prev => Math.min(3, prev + 1))} className="absolute -right-12 md:-right-16 top-1/2 -translate-y-1/2 p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all z-50 text-white"><ChevronRight/></button>
                </div>
                
                {/* Indicateurs de page */}
                <div className="flex gap-2">
                    {[0, 1, 2, 3].map(i => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentPage ? 'bg-white w-6' : 'bg-zinc-800'}`} />)}
                </div>

                {/* Les autres pages sont rendues mais cachées pour la capture */}
                <div className="absolute top-0 left-0 opacity-0 pointer-events-none">
                    {[0, 1, 2, 3].map(i => i !== currentPage && renderVisualPage(i, true))}
                </div>
            </div>
        ) : (
            /* Mode Unique */
            <div className="shadow-2xl border border-white/10">
                {renderVisualPage(0)}
            </div>
        )}

        <Button onClick={downloadImage} className="mt-8 bg-white text-black hover:bg-zinc-200 font-bold px-8 py-6 h-auto rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <Download className="mr-2"/> {format === "SINGLE" ? "Télécharger l'image" : "Télécharger les 4 pages PNG"}
        </Button>
      </div>
    </div>
  );
}