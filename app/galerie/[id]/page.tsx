"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

export default function GalerieAutomatique() {
    const params = useParams();
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [address, setAddress] = useState("");
    
    // État pour la photo en plein écran
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchPhotos = async () => {
            const { data } = await supabase.from('estimations').select('data_json').eq('id', params.id).single();
            if (data?.data_json) {
                const d = data.data_json;
                setAddress(d.propertyAddress || "");
                // Récupération sans doublons
                const all = Array.from(new Set([d.mainPhoto, ...(d.secondaryPhotos || []), ...(d.extraPhotos || [])])).filter(Boolean) as string[];
                setPhotos(all);
            }
            setLoading(false);
        };
        fetchPhotos();
    }, [params.id]);

    // Empêcher le scroll en arrière-plan
    useEffect(() => {
        if (selectedPhotoIndex !== null) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
    }, [selectedPhotoIndex]);

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPhotoIndex(prev => prev !== null ? (prev > 0 ? prev - 1 : photos.length - 1) : null);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPhotoIndex(prev => prev !== null ? (prev < photos.length - 1 ? prev + 1 : 0) : null);
    };

    // Le Filigrane : Placé en bas à droite, plus petit et discret
    const Watermark = () => (
        <div className="absolute bottom-4 right-4 pointer-events-none z-10">
            <img src="/logo-patrim.png" className="w-20 md:w-28 opacity-40 drop-shadow-md" alt="Watermark Patrim" />
        </div>
    );

    if (loading) return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white font-sans">Chargement de la galerie...</div>;
    if (photos.length === 0) return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white font-sans">Aucune photo disponible.</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0c] p-4 md:p-10 font-sans pb-10">
            <div className="max-w-4xl mx-auto space-y-8">
                
                <div className="pt-8 pb-4 text-center">
                    <img src="/logo-patrim.png" className="h-8 mx-auto mb-4 bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/5"/>
                    <h1 className="text-white font-serif text-2xl font-bold mb-1">Album Photographique</h1>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">{address}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {photos.map((url, i) => (
                        <div 
                            key={i} 
                            onClick={() => setSelectedPhotoIndex(i)}
                            className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 cursor-pointer group aspect-[4/3] bg-zinc-900"
                        >
                            <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={`Vue ${i+1}`} />
                            <Watermark />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                                    <ImageIcon size={24} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* LIGHTBOX PLEIN ÉCRAN */}
            {selectedPhotoIndex !== null && (
                <div className="fixed inset-0 z-50 bg-[#0a0a0c]/95 backdrop-blur-xl flex flex-col" onClick={() => setSelectedPhotoIndex(null)}>
                    
                    <button onClick={() => setSelectedPhotoIndex(null)} className="absolute top-6 right-6 text-zinc-400 hover:text-white bg-white/10 p-3 rounded-full backdrop-blur-md transition-colors z-50">
                        <X size={24} />
                    </button>

                    {/* Conteneur avec overflow-auto et touch-action pour permettre le PINCH-ZOOM sur mobile */}
                    <div className="flex-1 w-full h-full flex items-center justify-center overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative max-w-full max-h-full m-auto" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
                            <img 
                                src={photos[selectedPhotoIndex]} 
                                className="max-w-none max-h-none sm:max-w-full sm:max-h-[85vh] object-contain rounded-xl shadow-2xl" 
                                alt={`Vue HD ${selectedPhotoIndex + 1}`} 
                            />
                            <Watermark />
                        </div>
                    </div>

                    <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white bg-white/10 p-3 rounded-full backdrop-blur-md transition-colors z-50">
                        <ChevronLeft size={32} />
                    </button>
                    <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white bg-white/10 p-3 rounded-full backdrop-blur-md transition-colors z-50">
                        <ChevronRight size={32} />
                    </button>

                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white bg-white/10 px-4 py-2 rounded-full text-xs font-bold tracking-widest backdrop-blur-md z-50 pointer-events-none">
                        {selectedPhotoIndex + 1} / {photos.length}
                    </div>
                </div>
            )}
        </div>
    );
}