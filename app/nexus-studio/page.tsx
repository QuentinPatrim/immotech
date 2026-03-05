"use client";

import { useState, useRef, useEffect } from "react";
import { toPng } from 'html-to-image';
import { Download, Loader2, Linkedin, LayoutTemplate, BookOpen, GraduationCap, Calculator, TrendingUp, Quote, UploadCloud, CheckCircle2, Edit3, Wand2, Palette, Layers, ChevronLeft, ChevronRight, Square, Smartphone, Sparkles, Copy, PieChart as PieChartIcon, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { NexusLogo } from "@/components/NexusLogo";
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, Tooltip } from "recharts";
import { Switch } from "@/components/ui/switch";

// --- SÉCURITÉ ---
const ADMIN_ID = ""; 

// --- PALETTES ---
const THEMES: any = {
    emerald: { name: "Bull Market", text: "text-emerald-400", bg: "bg-emerald-500", border: "border-emerald-500/30", stroke: "#34d399" },
    amber:   { name: "Gold Standard", text: "text-amber-400", bg: "bg-amber-500", border: "border-amber-500/30", stroke: "#fbbf24" },
    indigo:  { name: "Deep Tech", text: "text-indigo-400", bg: "bg-indigo-500", border: "border-indigo-500/30", stroke: "#818cf8" },
    cyan:    { name: "Future Blue", text: "text-cyan-400", bg: "bg-cyan-500", border: "border-cyan-500/30", stroke: "#22d3ee" },
    rose:    { name: "Red Alert", text: "text-rose-400", bg: "bg-rose-500", border: "border-rose-500/30", stroke: "#fb7185" },
};

export default function NexusStudio() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("generator");
  
  // Format
  const [format, setFormat] = useState<"SINGLE" | "CAROUSEL">("CAROUSEL");
  const [currentPage, setCurrentPage] = useState(0);

  // Inputs
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [themeType, setThemeType] = useState("fiscalite");
  const [pdfText, setPdfText] = useState("");
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Design
  const [selectedColor, setSelectedColor] = useState<string>("amber");
  const [showNoise, setShowNoise] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [glassEffect, setGlassEffect] = useState(true);

  // Data
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
    chart_type: "area", // 'area' ou 'pie'
    chart_title: "Livret A vs S&P 500",
    chart_data: [
        { name: 'Start', value1: 100, value2: 100 },
        { name: 'Y2', value1: 102, value2: 120 },
        { name: 'Y5', value1: 105, value2: 180 },
        { name: 'Y10', value1: 115, value2: 280 },
    ],
    chart_legend: ["Livret A", "Actions Monde"],
    footer_conclusion: "La sécurité a un prix : c'est le coût d'opportunité de ne pas s'enrichir."
  });

  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!ADMIN_ID || (session && session.user.id === ADMIN_ID)) setAuthorized(true);
        setLoading(false);
    };
    checkAuth();
  }, []);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsReadingPdf(true);
    try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= Math.min(pdf.numPages, 8); i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
        setPdfText(fullText);
    } catch (err) { alert("Erreur PDF"); } finally { setIsReadingPdf(false); }
  };

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
        // Ajout du chart_type par défaut si l'IA l'oublie
        setData({ ...resJson.visual, chart_type: resJson.visual.chart_type || 'area' });
        setActiveTab("editor"); 
        setCurrentPage(0);
        if (themeType === 'bourse') setSelectedColor('emerald');
        else if (themeType === 'fiscalite') setSelectedColor('amber');
        else setSelectedColor('indigo');
    } catch (e) { alert("Erreur IA"); } finally { setIsGenerating(false); }
  };

  const updateData = (field: string, value: any) => setData((prev: any) => ({ ...prev, [field]: value }));
  
  const updateChartData = (index: number, key: string, value: any) => {
      const newData = data.chart_data.map((item: any, i: number) => i === index ? { ...item, [key]: value } : item);
      updateData('chart_data', newData);
  };

  const updateAnalysisPoint = (index: number, value: string) => {
      const newPoints = [...data.analysis_points];
      newPoints[index] = value;
      updateData('analysis_points', newPoints);
  };

  const updateKpi = (index: number, key: 'value' | 'label', val: string) => {
      const realKey = `kpi_${index + 1}_${key}`;
      updateData(realKey, val);
  };

  const downloadAll = async () => {
    const pagesToDownload = format === "SINGLE" ? [0] : [0, 1, 2, 3];
    for (const i of pagesToDownload) {
        const ref = exportRefs.current[i];
        if (ref) {
            await new Promise(r => setTimeout(r, 250)); 
            const dataUrl = await toPng(ref, { cacheBust: true, pixelRatio: 2, backgroundColor: '#08080A' });
            const link = document.createElement('a');
            link.download = format === "SINGLE" ? `nexus-post-${Date.now()}.png` : `nexus-slide-${i + 1}.png`;
            link.href = dataUrl;
            link.click();
        }
    }
  };

  const copyPost = () => { navigator.clipboard.writeText(postContent); alert("Copié !"); };
  const T = THEMES[selectedColor]; 

  // Couleurs pour le Camembert
  const PIE_COLORS = [T.stroke, '#52525b', '#3f3f46', '#27272a', '#18181b'];

  // --- RENDU VISUEL ---
  const renderVisualPage = (pageIndex: number, refToAttach: any = null) => {
    const isSingle = format === "SINGLE";
    
    return (
        <div 
            ref={refToAttach}
            className={`w-[540px] ${isSingle ? 'min-h-[675px] h-auto pb-12' : 'h-[540px]'} bg-[#050509]/95 flex flex-col shrink-0 shadow-[0_24px_80px_rgba(0,0,0,0.95)] border border-white/10 font-sans overflow-hidden relative text-white rounded-[32px] backdrop-blur-2xl`}
        >
            {showNoise && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0"></div>}
            {showGrid && <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>}
            
            {/* Header */}
            <div className={`px-8 ${isSingle ? 'pt-8 pb-6' : 'pt-6 pb-2'} bg-gradient-to-b from-white/5 to-transparent border-b border-white/5 relative z-10 shrink-0`}>
                <div className={`absolute top-0 right-0 w-[300px] h-[300px] ${T.bg} blur-[120px] opacity-20 pointer-events-none`}></div>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col items-start justify-center">
                        <div className={`px-2 py-1 rounded border border-white/10 bg-black/40 text-[8px] font-bold uppercase tracking-widest ${T.text}`}>{data.header_tag}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2 opacity-90"><div className="w-4 h-4 text-white"><NexusLogo className="w-full h-full"/></div><span className="text-xs font-black tracking-tighter uppercase">NEXUS</span></div>
                        {!isSingle && <div className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded border border-white/5">{pageIndex + 1} / 4</div>}
                    </div>
                </div>
                {(isSingle || pageIndex === 0) && <h2 className={`${isSingle ? 'text-3xl' : 'text-3xl'} font-black leading-tight uppercase tracking-tight`}>{data.header_title}</h2>}
            </div>

            {/* Corps */}
            <div className={`flex-1 px-8 ${isSingle ? 'py-6 gap-6' : 'py-3 gap-3'} relative z-10 flex flex-col justify-center`}>
                
                {/* PAGE 1: KPIs */}
                {(isSingle || pageIndex === 0) && (
                    <div className="grid grid-cols-3 gap-2">
                        {[{ v: data.kpi_1_value, l: data.kpi_1_label }, { v: data.kpi_2_value, l: data.kpi_2_label }, { v: data.kpi_3_value, l: data.kpi_3_label }].map((k, i) => (
                            <div key={i} className={`bg-white/5 rounded-lg p-4 text-center border ${glassEffect ? 'backdrop-blur-md border-white/10' : 'border-white/5'}`}>
                                <p className={`text-xl font-black ${T.text}`}>{k.v}</p>
                                <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider mt-1">{k.l}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* PAGE 2: Analyse */}
                {(isSingle || pageIndex === 1) && (
                    <div className={`space-y-4 ${!isSingle && 'scale-100 origin-top'}`}>
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><BookOpen size={12}/> {data.intro_title}</h3>
                            <p className="text-[12px] text-zinc-200 leading-relaxed text-justify border-l-2 border-white/20 pl-3">{data.intro_text}</p>
                        </div>
                        <div className="space-y-2">
                            <h3 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${T.text}`}><GraduationCap size={12}/> {data.analysis_title}</h3>
                            <div className={`bg-white/5 border rounded-xl p-4 space-y-3 ${glassEffect ? 'backdrop-blur-sm border-white/10' : 'border-white/5'}`}>
                                {data.analysis_points?.map((pt: string, i: number) => (
                                    <div key={i} className="flex items-start gap-3"><div className={`w-1.5 h-1.5 rounded-full ${T.bg} mt-1.5 shrink-0`}></div><p className="text-[11px] text-zinc-300 leading-snug">{pt}</p></div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* PAGE 3: Exemple + Graphique Intelligent */}
                {(isSingle || pageIndex === 2) && (
                    <div className={`grid gap-4 ${data.show_chart ? 'grid-cols-1' : 'grid-cols-1'} h-full content-center`}>
                        <div className={`bg-zinc-900/50 border rounded-xl p-4 flex flex-col justify-start ${glassEffect ? 'backdrop-blur-sm border-white/10' : 'border-white/5'}`}>
                            <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-2"><Calculator size={10}/> {data.example_title}</h3>
                            <p className="text-[11px] text-zinc-300 leading-relaxed italic border-l-2 border-white/10 pl-3">"{data.example_text}"</p>
                        </div>

                        {data.show_chart && (
                            <div className={`bg-zinc-900/50 border rounded-xl p-4 flex flex-col relative overflow-hidden ${glassEffect ? 'backdrop-blur-sm border-white/10' : 'border-white/5'} ${isSingle ? 'h-[200px]' : 'flex-1 min-h-[160px]'}`}>
                                <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    {data.chart_type === 'pie' ? <PieChartIcon size={10}/> : <TrendingUp size={10}/>} {data.chart_title}
                                </h3>
                                
                                <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {data.chart_type === 'pie' ? (
                                            <PieChart>
                                                <Pie 
                                                    data={data.chart_data} 
                                                    cx="50%" cy="50%" 
                                                    innerRadius={45} outerRadius={70} 
                                                    paddingAngle={2}
                                                    dataKey="value1"
                                                    stroke="none"
                                                >
                                                    {data.chart_data.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        ) : (
                                            <AreaChart data={data.chart_data}>
                                                <defs>
                                                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={T.stroke} stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor={T.stroke} stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                <XAxis dataKey="name" stroke="#52525b" fontSize={8} tickLine={false} axisLine={false} />
                                                <Area type="monotone" dataKey="value1" stroke={T.stroke} strokeWidth={3} fill="url(#grad)" dot={{ r: 3, fill: T.stroke, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                                                {data.chart_data[0].value2 && <Area type="monotone" dataKey="value2" stroke="#52525b" strokeWidth={2} strokeDasharray="4 4" fill="transparent" dot={false} />}
                                            </AreaChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                                
                                {/* Légende dynamique */}
                                <div className="absolute bottom-3 right-3 flex gap-3">
                                    {data.chart_type === 'pie' ? (
                                        data.chart_data.map((entry: any, index: number) => (
                                            <div key={index} className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full" style={{background: PIE_COLORS[index % PIE_COLORS.length]}}></div>
                                                <span className="text-[7px] text-zinc-300 uppercase font-bold tracking-wider">{entry.name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full" style={{background: T.stroke}}></div><span className="text-[7px] text-white uppercase font-bold tracking-wider">{data.chart_legend?.[0]}</span></div>
                                            {data.chart_legend?.[1] && <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full bg-zinc-600"></div><span className="text-[7px] text-zinc-500 uppercase font-bold tracking-wider">{data.chart_legend[1]}</span></div>}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* PAGE 4: Conclusion */}
                {(isSingle || pageIndex === 3) && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
                        <Quote size={48} className={`shrink-0 ${T.text} opacity-30`} />
                        <p className="text-2xl font-bold text-white leading-snug italic px-6">"{data.footer_conclusion}"</p>
                        <div className={`mt-8 px-8 py-3 rounded-full border ${T.border} ${T.text} font-bold text-[10px] uppercase tracking-widest bg-white/5 backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.05)]`}>Enregistrez ce post</div>
                    </div>
                )}
            </div>

            {isSingle && <div className="px-8 pt-4 pb-0 bg-black relative z-10 border-t border-white/5 mt-auto"><div className="flex gap-3 items-start"><Quote size={24} className={`shrink-0 ${T.text} opacity-50`} /><p className="text-sm font-bold text-white leading-snug italic">{data.footer_conclusion}</p></div></div>}
        </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-black" />;
  if (!authorized) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-800 font-black text-4xl">403</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 p-4 md:p-8 font-sans flex flex-col lg:flex-row gap-8 lg:gap-12">
      
      {/* COMMANDES */}
      <div className="w-full lg:w-1/3 flex flex-col h-auto lg:h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 mb-6 shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-[0_18px_50px_rgba(79,70,229,0.7)]"><LayoutTemplate size={20}/></div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Nexus <span className="text-indigo-500">Studio</span></h1>
        </div>

        <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl mb-6 shrink-0">
            <button onClick={() => setActiveTab("generator")} className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === "generator" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}><Wand2 size={14} className="inline mr-2"/> Générateur</button>
            <button onClick={() => setActiveTab("editor")} className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === "editor" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}><Edit3 size={14} className="inline mr-2"/> Éditeur</button>
        </div>

        <div className="flex-1 lg:overflow-y-auto pr-0 lg:pr-2 space-y-6 scrollbar-hide pb-20">
            
            {/* GÉNÉRATEUR */}
            {activeTab === "generator" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                    <div className="bg-zinc-900/40 p-6 rounded-3xl border border-white/10 space-y-4 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.85)]">
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button onClick={() => setFormat("SINGLE")} className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs transition-all ${format === "SINGLE" ? "bg-white text-black border-white" : "bg-black/40 text-zinc-500 border-white/10"}`}><Smartphone size={16}/> Mode Unique</button>
                            <button onClick={() => setFormat("CAROUSEL")} className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs transition-all ${format === "CAROUSEL" ? "bg-white text-black border-white" : "bg-black/40 text-zinc-500 border-white/10"}`}><Square size={16}/> Mode Carrousel</button>
                        </div>
                        <div className="space-y-2"><label className="text-xs font-bold text-zinc-500 uppercase">Sujet</label><Input value={topic} onChange={(e) => setTopic(e.target.value)} className="bg-black border-white/10"/></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-zinc-500 uppercase">Infos Clés</label><Textarea value={context} onChange={(e) => setContext(e.target.value)} className="bg-black border-white/10 min-h-[80px] text-xs"/></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-zinc-500 uppercase">Thème</label><Select value={themeType} onValueChange={setThemeType}><SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-900 border-white/10 text-white"><SelectItem value="fiscalite">Fiscalité</SelectItem><SelectItem value="bourse">Bourse</SelectItem><SelectItem value="budget">Budget</SelectItem></SelectContent></Select></div>
                        <Button onClick={generateContent} disabled={isGenerating} className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-12 rounded-xl">{isGenerating ? <Loader2 className="animate-spin mr-2"/> : <Sparkles className="mr-2"/>} Générer</Button>
                    </div>
                    <div className="space-y-2"><div className="flex justify-between items-center"><label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2"><Linkedin size={14}/> Post LinkedIn</label><Button variant="ghost" size="sm" onClick={copyPost} className="h-6 text-xs hover:bg-white/10"><Copy size={12} className="mr-1"/> Copier</Button></div><Textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} className="bg-zinc-900/50 border-white/10 min-h-[300px] text-sm leading-relaxed"/></div>
                </div>
            )}

            {/* ÉDITEUR COMPLET */}
            {activeTab === "editor" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 pb-20">
                    <div className="space-y-3 bg-zinc-900/40 p-4 rounded-2xl border border-white/10 backdrop-blur-xl shadow-[0_14px_50px_rgba(0,0,0,0.8)]">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2"><Palette size={12}/> Ambiance</label>
                        <div className="flex justify-between gap-2">{Object.entries(THEMES).map(([key, theme]: any) => (<button key={key} onClick={() => setSelectedColor(key)} className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === key ? "border-white scale-110" : "border-transparent hover:scale-105"}`} style={{ backgroundColor: theme.stroke }} title={theme.name}></button>))}</div>
                    </div>
                    <div className="space-y-3 bg-zinc-900/40 p-4 rounded-2xl border border-white/10 backdrop-blur-xl shadow-[0_14px_50px_rgba(0,0,0,0.8)]">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2"><Layers size={12}/> Visuel</label>
                        <div className="flex items-center justify-between"><span className="text-xs">Grain</span><Switch checked={showNoise} onCheckedChange={setShowNoise} /></div>
                        <div className="flex items-center justify-between"><span className="text-xs">Grille</span><Switch checked={showGrid} onCheckedChange={setShowGrid} /></div>
                        <div className="flex items-center justify-between"><span className="text-xs">Glass</span><Switch checked={glassEffect} onCheckedChange={setGlassEffect} /></div>
                    </div>

                    {/* ÉDITEUR DE CONTENU */}
                    <div className="space-y-4 pt-5 border-t border-white/10">
                        <h3 className="text-xs font-black text-white uppercase bg-zinc-800 px-3 py-1 rounded w-fit">En-tête & KPIs</h3>
                        <div className="space-y-2"><label className="text-[10px] text-zinc-500 uppercase font-bold">Titre</label><Input value={data.header_title} onChange={(e) => updateData('header_title', e.target.value)} className="bg-zinc-900 border-white/10"/></div>
                        <div className="space-y-2"><label className="text-[10px] text-zinc-500 uppercase font-bold">Tag</label><Input value={data.header_tag} onChange={(e) => updateData('header_tag', e.target.value)} className="bg-zinc-900 border-white/10"/></div>
                        <div className="grid grid-cols-3 gap-2">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="space-y-1">
                                    <Input value={data[`kpi_${i+1}_value`]} onChange={(e) => updateKpi(i, 'value', e.target.value)} className="bg-zinc-900 border-white/10 text-xs font-bold px-2"/>
                                    <Input value={data[`kpi_${i+1}_label`]} onChange={(e) => updateKpi(i, 'label', e.target.value)} className="bg-zinc-900 border-white/10 text-[9px] px-2 h-6"/>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-white uppercase bg-zinc-800 px-3 py-1 rounded w-fit">Contenu</h3>
                        <div className="space-y-2"><label className="text-[10px] text-zinc-500 uppercase font-bold">Titre Intro</label><Input value={data.intro_title} onChange={(e) => updateData('intro_title', e.target.value)} className="bg-zinc-900 border-white/10"/></div>
                        <div className="space-y-2"><label className="text-[10px] text-zinc-500 uppercase font-bold">Texte Intro</label><Textarea value={data.intro_text} onChange={(e) => updateData('intro_text', e.target.value)} className="bg-zinc-900 border-white/10 text-xs min-h-[80px]"/></div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Points Clés</label>
                            {data.analysis_points.map((pt: string, i: number) => (
                                <Textarea key={i} value={pt} onChange={(e) => updateAnalysisPoint(i, e.target.value)} className="bg-zinc-900 border-white/10 text-xs min-h-[50px] mb-2"/>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-white uppercase bg-zinc-800 px-3 py-1 rounded-full w-fit border border-white/10">Preuve & Graphique</h3>
                        <div className="space-y-2"><label className="text-[10px] text-zinc-500 uppercase font-bold">Titre Exemple</label><Input value={data.example_title} onChange={(e) => updateData('example_title', e.target.value)} className="bg-zinc-900 border-white/10"/></div>
                        <div className="space-y-2"><label className="text-[10px] text-zinc-500 uppercase font-bold">Texte Exemple</label><Textarea value={data.example_text} onChange={(e) => updateData('example_text', e.target.value)} className="bg-zinc-900 border-white/10 text-xs min-h-[70px]"/></div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <label className="text-xs font-bold">Afficher Graphique</label>
                            <Switch checked={data.show_chart} onCheckedChange={(c) => updateData('show_chart', c)} />
                        </div>

                        {data.show_chart && (
                            <div className="space-y-3 bg-black/25 p-3 rounded-2xl border border-white/10 backdrop-blur-lg">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Type de Graphique</label>
                                    <Select value={data.chart_type || 'area'} onValueChange={(v) => updateData('chart_type', v)}>
                                        <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-xs h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                            <SelectItem value="area"><div className="flex items-center gap-2"><LineChart size={12}/> Courbe Évolution</div></SelectItem>
                                            <SelectItem value="pie"><div className="flex items-center gap-2"><PieChartIcon size={12}/> Camembert Répartition</div></SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Titre Graphique</label>
                                    <Input value={data.chart_title} onChange={(e) => updateData('chart_title', e.target.value)} className="bg-zinc-900 border-white/10 text-xs h-8"/>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold flex justify-between">
                                        <span>Données</span>
                                        <span>{data.chart_type === 'pie' ? '(Nom / Valeur)' : '(Nom / Val1 / Val2)'}</span>
                                    </label>
                                    {data.chart_data.map((pt: any, i: number) => (
                                        <div key={i} className="flex gap-2">
                                            <Input value={pt.name} onChange={(e) => updateChartData(i, 'name', e.target.value)} className="flex-1 bg-zinc-900 border-white/10 text-xs px-2 h-8" placeholder="Label"/>
                                            <Input type="number" value={pt.value1} onChange={(e) => updateChartData(i, 'value1', Number(e.target.value))} className="w-20 bg-zinc-900 border-white/10 text-xs px-2 h-8"/>
                                            {data.chart_type !== 'pie' && (
                                                <Input type="number" value={pt.value2} onChange={(e) => updateChartData(i, 'value2', Number(e.target.value))} className="w-20 bg-zinc-900 border-white/10 text-xs px-2 h-8"/>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2"><h3 className="text-xs font-black text-white uppercase bg-zinc-800 px-3 py-1 rounded w-fit">Pied de Page</h3><Textarea value={data.footer_conclusion} onChange={(e) => updateData('footer_conclusion', e.target.value)} className="bg-zinc-900 border-white/10 text-xs min-h-[50px]"/></div>
                </div>
            )}
        </div>
      </div>

      {/* --- DROITE : VISUALISATION --- */}
      <div className="flex-1 bg-gradient-to-br from-zinc-950 via-black to-zinc-900/95 rounded-[40px] border border-white/10 p-4 lg:p-12 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
        
        {/* SCALE RESPONSIVE : Astuce pour que ça rentre sur mobile (scale down) */}
        <div className="scale-[0.55] sm:scale-75 md:scale-90 lg:scale-100 origin-center transition-transform duration-300">
            {format === "CAROUSEL" ? (
                <div className="flex flex-col items-center gap-8">
                    <div className="relative flex items-center group">
                        <button onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} className="absolute -left-16 top-1/2 -translate-y-1/2 p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all z-50 text-white"><ChevronLeft/></button>
                        {renderVisualPage(currentPage)}
                        <button onClick={() => setCurrentPage(prev => Math.min(3, prev + 1))} className="absolute -right-16 top-1/2 -translate-y-1/2 p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all z-50 text-white"><ChevronRight/></button>
                    </div>
                    <div className="flex gap-2">
                        {[0, 1, 2, 3].map(i => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentPage ? 'bg-white w-6' : 'bg-zinc-800'}`} />)}
                    </div>
                </div>
            ) : (
                <div className="shadow-2xl border border-white/10">{renderVisualPage(0)}</div>
            )}
        </div>

        <Button onClick={downloadAll} className="mt-8 bg-white text-black hover:bg-zinc-200 font-bold px-8 py-6 h-auto rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)] relative z-20">
            <Download className="mr-2"/> {format === "SINGLE" ? "Télécharger l'image" : "Télécharger les 4 pages"}
        </Button>

        {/* GHOST ZONE FIXÉE : On rend les images derrière le site (z-index négatif) pour que le navigateur les "peigne" */}
        <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none flex flex-col gap-4">
            {[0, 1, 2, 3].map(i => (
                <div key={`export-${i}`} ref={el => { exportRefs.current[i] = el }}>
                    {renderVisualPage(i)}
                </div>
            ))}
        </div>

      </div>
    </div>
  );
}