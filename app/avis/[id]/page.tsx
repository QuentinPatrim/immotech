"use client";

/* ============================================================
   PAGE PUBLIQUE : /avis/[id]
   Avis de valeur partagé avec le client à la fin du rendez-vous
   (QR code, WhatsApp, e-mail). Lisible sans compte, uniquement
   si l'agent a activé le partage du dossier (get_shared_avis).
   ============================================================ */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ThemeToggle from "@/components/estimation/ThemeToggle";
import type { FinancingState } from "@/components/rdv/FinancingSection";
import MeetingPresentation, { type MeetingMode, type PresentationData } from "@/components/rdv/MeetingPresentation";

export default function SharedAvisPage() {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<(PresentationData & { meeting?: { mode?: MeetingMode; askingPrice?: number; financing?: FinancingState } }) | null | undefined>(undefined);

    useEffect(() => {
        void supabase.rpc("get_shared_avis", { p_id: id }).then(({ data: d, error }) => setData(error ? null : (d as typeof data) ?? null));
    }, [id]);

    if (data === undefined) return <div className="patrim-ui min-h-screen flex items-center justify-center text-[var(--p-muted)]"><Loader2 className="animate-spin" size={22}/></div>;
    if (!data) {
        return (
            <div className="patrim-ui min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
                <Lock size={22} className="text-[var(--p-muted)]"/>
                <p className="text-[var(--p-fg)] font-semibold">Cet avis n&apos;est plus partagé.</p>
                <p className="text-sm text-[var(--p-muted)]">Contactez votre conseiller Patrim pour recevoir un nouveau lien.</p>
            </div>
        );
    }
    return (
        <div className="patrim-ui min-h-screen">
            <div className="fixed top-4 right-4 z-40"><ThemeToggle className="!bg-[rgba(0,0,0,0.35)] !text-white !border-transparent backdrop-blur"/></div>
            <MeetingPresentation data={data} mode={data.meeting?.mode || "vendeur"} askingPrice={data.meeting?.askingPrice} financing={data.meeting?.financing}/>
        </div>
    );
}
