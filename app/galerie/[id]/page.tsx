"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { X, ChevronLeft, ChevronRight, ImageIcon, Search } from "lucide-react";

export default function GalerieAutomatique() {
    const params = useParams();
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [address, setAddress] = useState("");
    
    // --- ÉTATS DE LA GALERIE ---
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

    // --- ÉTATS DU MOTEUR TACTILE (Zoom & Swipe) ---
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
                const all = Array.from(new Set([d.mainPhoto, ...(d.secondaryPhotos || []), ...(d.extraPhotos || [])])).filter(Boolean) as string[];
                setPhotos(all);
            }
            setLoading(false);
        };
        fetchPhotos();
    }, [params.id]);

    // Bloquer le scroll et écouter le clavier
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedPhotoIndex === null) return;
            if (e.key === 'Escape') {
                setSelectedPhotoIndex(null);
                setScale(1);
                setPos({ x: 0, y: 0 });
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

    // --- GESTIONNAIRE DE GESTES TACTILES ---
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

    if (loading) return <div className="min-h-screen bg-[#f8f8f9] flex items-center justify-center text-zinc-800 font-sans">Chargement de la galerie...</div>;
    if (photos.length === 0) return <div className="min-h-screen bg-[#f8f8f9] flex items-center justify-center text-zinc-800 font-sans">Aucune photo disponible.</div>;

    return (
        <div className="min-h-screen bg-[#f8f8f9] p-4 md:p-10 font-sans pb-10">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="pt-10 pb-6 text-center">
                    <img src="/logo-patrim.png" className="h-16 md:h-20 mx-auto mb-6 object-contain" alt="Patrim"/>
                    <h1 className="text-zinc-900 font-serif text-3xl md:text-4xl font-bold mb-2">Album Photographique</h1>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">{address}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {photos.map((url, i) => (
                        <div key={i} onClick={() => setSelectedPhotoIndex(i)} className="relative rounded-3xl overflow-hidden shadow-lg border border-zinc-200 cursor-pointer group aspect-[4/3] bg-white">
                            <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={`Vue ${i+1}`} />
                            <div className="absolute bottom-4 right-4 pointer-events-none z-10">
                                <img src="/logo-patrim.png" className="w-20 opacity-50 drop-shadow-md" alt="Watermark Patrim" />
                            </div>
                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/30 transition-colors duration-300 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 backdrop-blur-md p-3 rounded-full text-white">
                                    <ImageIcon size={24} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedPhotoIndex !== null && (
                <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col touch-none" onClick={() => { if (scale === 1) setSelectedPhotoIndex(null); else { setScale(1); setPos({ x: 0, y: 0 }); } }}>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedPhotoIndex(null); }} className="absolute top-6 right-6 text-zinc-600 hover:text-black bg-black/5 hover:bg-black/10 p-3 rounded-full backdrop-blur-md transition-colors z-50">
                        <X size={24} />
                    </button>

                    {scale === 1 && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-zinc-500 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 pointer-events-none z-50 bg-black/5 px-4 py-2 rounded-full border border-black/10">
                            <Search size={14}/> {window.innerWidth > 768 ? "Utilisez les flèches du clavier" : "Pincez pour zoomer"}
                        </div>
                    )}

                    <div className="flex-1 w-full h-full flex items-center justify-center p-4 md:p-12 overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                        <div className="relative inline-block max-w-full max-h-[85vh]" style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transitionDuration: isDragging ? '0ms' : '200ms', transformOrigin: 'center center' }} onClick={(e) => e.stopPropagation()} onDoubleClick={toggleZoom}>
                            <img src={photos[selectedPhotoIndex]} className="max-w-full max-h-[85vh] block rounded-xl shadow-2xl border border-zinc-200" alt="Vue HD" draggable={false} />
                            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 pointer-events-none z-10">
                                <img src="/logo-patrim.png" className="w-24 md:w-32 opacity-60 drop-shadow-lg" alt="Watermark Patrim" />
                            </div>
                        </div>
                    </div>

                    <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} className="hidden md:flex absolute left-10 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-black bg-black/5 hover:bg-black/10 p-4 rounded-full backdrop-blur-md transition-colors z-50">
                        <ChevronLeft size={32} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} className="hidden md:flex absolute right-10 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-black bg-black/5 hover:bg-black/10 p-4 rounded-full backdrop-blur-md transition-colors z-50">
                        <ChevronRight size={32} />
                    </button>

                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-zinc-800 bg-black/5 border border-black/10 px-5 py-2 rounded-full text-xs font-bold tracking-widest backdrop-blur-md z-50 pointer-events-none shadow-sm">
                        {selectedPhotoIndex + 1} / {photos.length}
                    </div>
                </div>
            )}
        </div>
    );
}