"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { X, ChevronLeft, ChevronRight, ImageIcon, Search, Camera, ZoomIn, Calculator, ArrowRight } from "lucide-react";

/* ============================================================
   PATRIM · Charte couleurs
   ============================================================ */
const COLORS = {
    primary: "#8a0e01",   // ROUGE PATRIM
    secondary: "#d35f52", // ROSE PATRIM
    gray: "#393939",      // GRIS PATRIM
};

export default function GalerieAutomatique() {
    const params = useParams();
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [address, setAddress] = useState("");
    const [price, setPrice] = useState<number>(0);

    // --- ÉTATS GALERIE ---
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

    // --- MOTEUR TACTILE (Zoom & Swipe) ---
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [initialPinchDist, setInitialPinchDist] = useState<number | null>(null);

    useEffect(() => {
        const fetchPhotos = async () => {
            const { data } = await supabase.from('estimations').select('data_json').eq('id', params.id).single();
            if (data?.data_json) {
                const d = data.data_json;
                setAddress(d.propertyAddress || "");
                setPrice(d.highPrice || 0);
                const all = Array.from(new Set([d.mainPhoto, ...(d.secondaryPhotos || []), ...(d.extraPhotos || [])])).filter(Boolean) as string[];
                setPhotos(all);
            }
            setLoading(false);
        };
        fetchPhotos();
    }, [params.id]);

    // Scroll-lock + clavier
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedPhotoIndex === null) return;
            if (e.key === 'Escape') {
                setSelectedPhotoIndex(null);
                setScale(1); setPos({ x: 0, y: 0 });
            }
            if (e.key === 'ArrowLeft') {
                setSelectedPhotoIndex(prev => prev !== null ? (prev > 0 ? prev - 1 : photos.length - 1) : null);
                setScale(1); setPos({ x: 0, y: 0 });
            }
            if (e.key === 'ArrowRight') {
                setSelectedPhotoIndex(prev => prev !== null ? (prev < photos.length - 1 ? prev + 1 : 0) : null);
                setScale(1); setPos({ x: 0, y: 0 });
            }
        };

        if (selectedPhotoIndex !== null) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPhotoIndex, photos.length]);

    // --- NAVIGATION CLICS ---
    const prevPhoto = () => { setSelectedPhotoIndex(prev => prev !== null ? (prev > 0 ? prev - 1 : photos.length - 1) : null); setScale(1); setPos({ x: 0, y: 0 }); };
    const nextPhoto = () => { setSelectedPhotoIndex(prev => prev !== null ? (prev < photos.length - 1 ? prev + 1 : 0) : null); setScale(1); setPos({ x: 0, y: 0 }); };

    // --- GESTURE HANDLERS ---
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            setInitialPinchDist(dist);
        } else if (e.touches.length === 1) {
            setIsDragging(true);
            setStartPos({ x: e.touches[0].clientX - pos.x, y: e.touches[0].clientY - pos.y });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && initialPinchDist) {
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const newScale = Math.min(Math.max(1, scale * (dist / initialPinchDist)), 4);
            setScale(newScale);
            setInitialPinchDist(dist);
        } else if (e.touches.length === 1 && isDragging) {
            setPos({ x: e.touches[0].clientX - startPos.x, y: e.touches[0].clientY - startPos.y });
        }
    };

    const handleTouchEnd = () => {
        setInitialPinchDist(null);
        setIsDragging(false);
        if (scale === 1) {
            if (pos.x > 75) prevPhoto();
            else if (pos.x < -75) nextPhoto();
            setPos({ x: 0, y: 0 });
        }
    };

    const toggleZoom = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (scale > 1) { setScale(1); setPos({ x: 0, y: 0 }); }
        else { setScale(2.5); }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <img src="/logo-patrim.png" className="h-12 object-contain animate-pulse" alt="Patrim"/>
                <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-bold">Chargement de la galerie…</p>
            </div>
        </div>
    );

    if (photos.length === 0) return (
        <div className="min-h-screen bg-[#faf8f6] flex items-center justify-center text-zinc-800 font-sans">
            Aucune photo disponible.
        </div>
    );

    return (
        <div className="min-h-screen bg-[#faf8f6] p-4 md:p-10 font-sans pb-10 relative overflow-hidden selection:bg-[#d35f52]/30">
            {/* Halos décoratifs cohérents avec la simulation */}
            <div className="pointer-events-none fixed top-0 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20" style={{ background: `radial-gradient(circle, ${COLORS.secondary} 0%, transparent 70%)` }}/>
            <div className="pointer-events-none fixed top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15" style={{ background: `radial-gradient(circle, ${COLORS.primary} 0%, transparent 70%)` }}/>

            <div className="max-w-4xl mx-auto space-y-8 relative z-10 pb-24">
                {/* HEADER PREMIUM */}
                <div className="pt-10 pb-6 text-center">
                    <div className="inline-flex flex-col items-center gap-4 px-8 py-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-white shadow-[0_20px_60px_-15px_rgba(138,14,1,0.15)]">
                        <img src="/logo-patrim.png" className="h-16 md:h-20 object-contain" alt="Patrim"/>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full border" style={{ background: `${COLORS.secondary}0D`, borderColor: `${COLORS.secondary}30` }}>
                            <Camera size={11} style={{ color: COLORS.primary }}/>
                            <span className="text-[9px] uppercase tracking-[0.25em] font-black" style={{ color: COLORS.primary }}>Album Photographique</span>
                        </div>
                        <div>
                            <h1 className="text-zinc-900 font-serif text-3xl md:text-4xl font-bold mb-2 leading-tight">
                                {photos.length} {photos.length > 1 ? "Photos" : "Photo"}
                            </h1>
                            {address && (
                                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.25em] font-bold">{address}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* GRILLE PHOTOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                    {photos.map((url, i) => (
                        <div
                            key={i}
                            onClick={() => setSelectedPhotoIndex(i)}
                            className="relative rounded-3xl overflow-hidden shadow-[0_20px_50px_-15px_rgba(138,14,1,0.2)] border border-white cursor-pointer group aspect-[4/3] bg-white transition-all duration-500 hover:shadow-[0_25px_60px_-10px_rgba(138,14,1,0.3)] hover:-translate-y-1"
                        >
                            <img
                                src={url}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                alt={`Photo ${i+1}`}
                            />

                            {/* Numéro photo en haut-gauche */}
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white shadow-md opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-4px] group-hover:translate-y-0">
                                <span className="text-[9px] uppercase tracking-widest font-black" style={{ color: COLORS.primary }}>
                                    {(i + 1).toString().padStart(2, '0')} / {photos.length.toString().padStart(2, '0')}
                                </span>
                            </div>

                            {/* Watermark logo en bas-droite */}
                            <div className="absolute bottom-4 right-4 pointer-events-none z-10">
                                <div className="bg-white/80 backdrop-blur-md p-2 rounded-xl border border-white/80 shadow-md">
                                    <img src="/logo-patrim.png" className="w-16 object-contain" alt="Patrim" />
                                </div>
                            </div>

                            {/* Overlay hover avec icône zoom */}
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center"
                                style={{ background: `linear-gradient(135deg, ${COLORS.primary}10, ${COLORS.secondary}25)` }}
                            >
                                <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-white transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                    <ZoomIn size={22} style={{ color: COLORS.primary }}/>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer discret */}
                <div className="text-center pt-6 pb-4">
                    <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-zinc-400">
                        Photos © PATRIM · Reproduction interdite
                    </p>
                </div>
            </div>

            {/* ============================================================
                BOUTON STICKY FLOTTANT — Accès au simulateur
                Masqué quand la lightbox est ouverte pour ne pas gêner
                ============================================================ */}
            {selectedPhotoIndex === null && (
                <Link
                    href={`/simulation/${params.id}${price > 0 ? `?price=${price}` : ''}`}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 group animate-in slide-in-from-bottom-8 fade-in duration-500"
                >
                    <div
                        className="relative flex items-center gap-3 pl-4 pr-3 py-3 rounded-full backdrop-blur-2xl border border-white shadow-[0_20px_50px_-10px_rgba(138,14,1,0.5)] transition-all duration-300 hover:scale-105 hover:shadow-[0_25px_60px_-10px_rgba(138,14,1,0.65)]"
                        style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}
                    >
                        {/* Halo de brillance au hover */}
                        <div
                            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                            style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)` }}
                        />

                        {/* Icône calculator */}
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex-shrink-0">
                            <Calculator size={16} className="text-white"/>
                        </div>

                        {/* Texte */}
                        <div className="flex flex-col pr-1">
                            <span className="text-[8px] uppercase tracking-[0.25em] font-black text-white/80 leading-none">Ce bien vous plaît ?</span>
                            <span className="text-xs md:text-sm font-black text-white tracking-tight leading-tight mt-0.5">
                                Calculer ma mensualité
                            </span>
                        </div>

                        {/* Flèche */}
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/90 group-hover:bg-white transition-all duration-300 flex-shrink-0 shadow-md group-hover:translate-x-0.5">
                            <ArrowRight size={16} style={{ color: COLORS.primary }}/>
                        </div>
                    </div>
                </Link>
            )}

            {/* ============================================================
                LIGHTBOX PREMIUM
               ============================================================ */}
            {selectedPhotoIndex !== null && (
                <div
                    className="fixed inset-0 z-50 bg-[#faf8f6]/97 backdrop-blur-2xl flex flex-col touch-none"
                    onClick={() => { if (scale === 1) setSelectedPhotoIndex(null); else { setScale(1); setPos({ x: 0, y: 0 }); } }}
                >
                    {/* Halos décoratifs aussi dans la lightbox */}
                    <div className="pointer-events-none fixed top-0 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15" style={{ background: `radial-gradient(circle, ${COLORS.secondary} 0%, transparent 70%)` }}/>
                    <div className="pointer-events-none fixed bottom-0 -right-40 w-[500px] h-[500px] rounded-full blur-[140px] opacity-10" style={{ background: `radial-gradient(circle, ${COLORS.primary} 0%, transparent 70%)` }}/>

                    {/* Logo top-left */}
                    <div className="absolute top-6 left-6 flex items-center gap-3 bg-white/80 backdrop-blur-xl p-3 pr-5 rounded-2xl border border-white shadow-lg z-50 pointer-events-none">
                        <img src="/logo-patrim.png" className="h-7 object-contain" alt="Patrim"/>
                        <div className="h-6 w-px bg-zinc-300"/>
                        <div className="flex flex-col">
                            <span className="text-[8px] uppercase tracking-[0.25em] font-bold text-zinc-500 leading-none">Patrim</span>
                            <span className="text-[10px] uppercase tracking-widest font-black leading-tight" style={{ color: COLORS.primary }}>Galerie HD</span>
                        </div>
                    </div>

                    {/* Bouton fermer */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(null); }}
                        className="absolute top-6 right-6 text-zinc-700 hover:text-black bg-white/80 hover:bg-white p-3 rounded-2xl backdrop-blur-xl border border-white shadow-lg transition-all z-50 hover:scale-105"
                    >
                        <X size={22} />
                    </button>

                    {/* Indicateur */}
                    {scale === 1 && (
                        <div className="absolute top-24 md:top-8 left-1/2 -translate-x-1/2 text-zinc-700 text-[9px] uppercase tracking-[0.25em] font-black flex items-center gap-2 pointer-events-none z-40 bg-white/80 backdrop-blur-xl px-4 py-2 rounded-full border border-white shadow-md">
                            <Search size={12} style={{ color: COLORS.primary }}/>
                            <span className="hidden md:inline">Flèches clavier pour naviguer</span>
                            <span className="md:hidden">Pincez pour zoomer</span>
                        </div>
                    )}

                    {/* Conteneur photo */}
                    <div
                        className="flex-1 w-full h-full flex items-center justify-center p-4 md:p-12 overflow-hidden"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div
                            className="relative inline-block max-w-full max-h-[85vh]"
                            style={{
                                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                                transitionDuration: isDragging ? '0ms' : '200ms',
                                transformOrigin: 'center center'
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={toggleZoom}
                        >
                            <img
                                src={photos[selectedPhotoIndex]}
                                className="max-w-full max-h-[85vh] block rounded-2xl shadow-[0_30px_100px_-20px_rgba(138,14,1,0.4)] border border-white"
                                alt="Photo HD"
                                draggable={false}
                            />
                            {/* Watermark lightbox */}
                            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 pointer-events-none z-10">
                                <div className="bg-white/85 backdrop-blur-xl p-2.5 rounded-2xl border border-white/80 shadow-lg">
                                    <img src="/logo-patrim.png" className="w-20 md:w-28 object-contain" alt="Patrim" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation desktop */}
                    <button
                        onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                        className="hidden md:flex absolute left-10 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-black bg-white/80 hover:bg-white p-4 rounded-2xl backdrop-blur-xl border border-white shadow-lg transition-all z-50 hover:scale-105 hover:-translate-x-1"
                    >
                        <ChevronLeft size={28} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                        className="hidden md:flex absolute right-10 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-black bg-white/80 hover:bg-white p-4 rounded-2xl backdrop-blur-xl border border-white shadow-lg transition-all z-50 hover:scale-105 hover:translate-x-1"
                    >
                        <ChevronRight size={28} />
                    </button>

                    {/* Compteur bas */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/85 backdrop-blur-xl border border-white shadow-lg px-5 py-2.5 rounded-full z-50 pointer-events-none">
                        <div className="flex items-center gap-2.5">
                            <span className="font-mono font-black text-sm" style={{ color: COLORS.primary }}>
                                {(selectedPhotoIndex + 1).toString().padStart(2, '0')}
                            </span>
                            <span className="text-zinc-400 text-xs font-black">/</span>
                            <span className="font-mono font-bold text-sm text-zinc-600">
                                {photos.length.toString().padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}