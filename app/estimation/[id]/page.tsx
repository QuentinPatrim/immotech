"use client";

/* ============================================================
   PAGE : /estimation/[id]
   Wrapper qui fetch une estimation existante depuis Supabase
   et l'affiche dans EstimationEditor (en mode EDIT par défaut).

   Gestion des cas :
   - ID invalide / introuvable → redirige vers /mes-biens
   - Pas connecté → redirige vers /login?next=… (retour ici après connexion)
   - ?view=print → ouvre directement l'avis de valeur (PDF)
   - Chargement en cours → skeleton sobre
   ============================================================ */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import EstimationEditor, { DEFAULT_DATA, EstimationData } from "@/components/EstimationEditor";

export default function EditEstimationPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string | undefined;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<EstimationData | null>(null);
    const [initialView, setInitialView] = useState<"EDIT" | "PRINT">("EDIT");
    const [initialStep, setInitialStep] = useState(1);

    useEffect(() => {
        if (!id) {
            router.replace("/mes-biens");
            return;
        }

        const fetchEstimation = async () => {
            setLoading(true);
            const query = new URLSearchParams(window.location.search);
            if (query.get("view") === "print") setInitialView("PRINT");
            // ?step=3 : ouverture directe d'une étape (ex. après une capture d'annonces)
            const step = Number(query.get("step"));
            if (step >= 1 && step <= 4) setInitialStep(step);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace(`/login?next=${encodeURIComponent(`/estimation/${id}`)}`);
                return;
            }

            const { data: estim, error } = await supabase
                .from("estimations")
                .select("*")
                .eq("id", id)
                .eq("user_id", user.id) // sécurité : on ne charge que SES estimations
                .maybeSingle();

            if (error || !estim) {
                router.replace("/mes-biens");
                return;
            }

            // Fusion avec DEFAULT_DATA pour garantir que tous les champs sont présents
            // (utile si l'estimation a été créée avant l'ajout de nouveaux champs).
            const merged: EstimationData = {
                ...DEFAULT_DATA,
                ...(estim.data_json || {}),
                amenities: estim.data_json?.amenities ?? [],
                floor: estim.data_json?.floor ?? "",
                buildYear: estim.data_json?.buildYear ?? 0,
                hasElevator: estim.data_json?.hasElevator ?? false,
                extraPhotos: estim.data_json?.extraPhotos ?? [],
                plotSurface: estim.data_json?.plotSurface ?? 0,
                gardenSurface: estim.data_json?.gardenSurface ?? 0,
                isRented: estim.data_json?.isRented ?? false,
                lowPriceRented: estim.data_json?.lowPriceRented ?? 0,
                highPriceRented: estim.data_json?.highPriceRented ?? 0,
            };

            setData(merged);
            setLoading(false);
        };

        fetchEstimation();
    }, [id, router]);

    // --- Skeleton de chargement (cohérent avec la charte sombre) ---
    if (loading || !data) {
        return (
            <div className="patrim-ui min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: "var(--p-accent)" }}/>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--p-muted)] font-bold">
                        Chargement du dossier…
                    </p>
                </div>
            </div>
        );
    }

    return (
        <EstimationEditor
            initialData={data}
            existingId={id!}
            initialView={initialView}
            initialStep={initialStep}
        />
    );
}