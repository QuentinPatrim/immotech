import { supabase } from "@/lib/supabaseClient";

/* ============================================================
   Lecture d'une estimation par lien partagé (simulation, galerie,
   plaquette, brochure…) — accessible sans connexion.

   Passe par la fonction SQL get_shared_estimation (security definer)
   qui renvoie data_json SANS les données personnelles du vendeur
   (nom, adresse) ni le suivi interne. Voir supabase/migrations.
   Tant que la migration n'est pas appliquée, repli sur la lecture
   directe de la table (comportement historique).
   ============================================================ */
export async function fetchSharedEstimation(id: string): Promise<any | null> {
    const { data, error } = await supabase.rpc("get_shared_estimation", { p_id: id });
    if (!error) return data ?? null;
    const { data: row } = await supabase.from("estimations").select("data_json").eq("id", id).maybeSingle();
    return row?.data_json ?? null;
}

/** Lecture d'un QR code par lien partagé (sans le user_id). Repli : lecture directe. */
export async function fetchSharedQrCode(id: string): Promise<any | null> {
    const { data, error } = await supabase.rpc("get_shared_qr_code", { p_id: id });
    if (!error) return data ?? null;
    const { data: row } = await supabase.from("qr_codes").select("*").eq("id", id).maybeSingle();
    return row ?? null;
}
