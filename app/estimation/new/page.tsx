"use client";

/* ============================================================
   PAGE : /estimation/new
   Wrapper pour créer une nouvelle estimation vierge.
   Au premier "Sauvegarder", EstimationEditor fait un
   router.replace('/estimation/[nouvel-id]') pour que l'URL
   reflète l'état (et qu'un rafraîchissement ne recrée pas
   un doublon).
   ============================================================ */

import EstimationEditor, { DEFAULT_DATA } from "@/components/EstimationEditor";

export default function NewEstimationPage() {
    return (
        <EstimationEditor
            initialData={DEFAULT_DATA}
            existingId={null}
            initialView="EDIT"
        />
    );
}