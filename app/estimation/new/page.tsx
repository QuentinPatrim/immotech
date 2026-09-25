"use client";

/* ============================================================
   PAGE : /estimation/new
   Wrapper pour créer une nouvelle estimation vierge.
   Au premier enregistrement (auto ou manuel), EstimationEditor
   remplace l'URL par /estimation/[nouvel-id] via history.replaceState
   (sans remonter l'éditeur), pour qu'un rafraîchissement ne recrée
   pas de doublon.
   ============================================================ */

import { useEffect } from "react";
import EstimationEditor, { DEFAULT_DATA } from "@/components/EstimationEditor";

export default function NewEstimationPage() {
    // Après le 1er enregistrement, l'URL devient /estimation/[id] sans rechargement.
    // Si le navigateur revient sur cette entrée d'historique (bouton Retour), Next
    // restaure la page "nouvelle estimation" vide : on recharge alors le vrai dossier.
    useEffect(() => {
        if (window.location.pathname !== "/estimation/new") window.location.reload();
    }, []);

    return (
        <EstimationEditor
            initialData={DEFAULT_DATA}
            existingId={null}
            initialView="EDIT"
        />
    );
}