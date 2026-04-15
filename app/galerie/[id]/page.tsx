"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function GalerieAutomatique() {
    const params = useParams();
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPhotos = async () => {
            const { data } = await supabase.from('estimations').select('data_json').eq('id', params.id).single();
            if (data?.data_json) {
                const d = data.data_json;
                // On rassemble toutes les photos sans doublons
                const all = Array.from(new Set([d.mainPhoto, ...(d.secondaryPhotos || []), ...(d.extraPhotos || [])])).filter(Boolean) as string[];
                setPhotos(all);
            }
            setLoading(false);
        };
        fetchPhotos();
    }, [params.id]);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Chargement de la galerie...</div>;

    return (
        <div className="min-h-screen bg-black p-4">
            <div className="max-w-lg mx-auto space-y-4">
                <div className="pt-8 pb-4 text-center">
                    <img src="/logo-patrim.png" className="h-8 mx-auto mb-2 bg-white p-2 rounded-lg"/>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Dossier photographique HD</p>
                </div>
                {photos.map((url, i) => (
                    <div key={i} className="rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                        <img src={url} className="w-full h-auto object-cover" alt={`Photo ${i+1}`} />
                    </div>
                ))}
            </div>
        </div>
    );
}