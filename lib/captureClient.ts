import { supabase } from "@/lib/supabaseClient";
import { rowToListing, type CapturePayload, type MarketListing } from "@/lib/marketListings";

/* ============================================================
   Annonces capturées (navigateur) : décodage de la capture de
   l'extension, envoi à l'API, lecture / mise à jour du dossier.
   ============================================================ */

/** Dernier dossier ouvert dans l'éditeur : cible proposée par défaut pour une capture */
export const LAST_ESTIMATION_KEY = "patrim:lastEstimation";

/** « #d=… » (JSON compressé gzip, base64url) → capture */
export async function decodeCapture(encoded: string): Promise<CapturePayload> {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const payload = JSON.parse(await new Response(stream).text()) as CapturePayload;
    if (payload?.v !== 1 || typeof payload.url !== "string") throw new Error("Capture illisible");
    return payload;
}

async function authHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Session expirée — reconnectez-vous.");
    return { Authorization: `Bearer ${session.access_token}` };
}

export interface CaptureResult {
    portal: string;
    found: number;
    added: number;
    updated: number;
    merged: number;
    /** Annonces lues mais écartées car trop différentes du bien estimé */
    skipped?: SkippedListing[];
    listings: MarketListing[];
}

export interface SkippedListing {
    title: string;
    price: number | null;
    surface: number | null;
    district: string | null;
    reason: "type" | "surface" | "pièces" | "quartier" | "prix";
}

export async function sendCapture(estimationId: string, payload: CapturePayload, onlySimilar = true): Promise<CaptureResult> {
    const res = await fetch("/api/annonces/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ estimationId, payload, onlySimilar }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Import impossible.");
    return json as CaptureResult;
}

const COLS = "id,url,portal,data,selected,first_seen_at,last_seen_at";

export async function fetchListings(estimationId: string): Promise<MarketListing[]> {
    const { data, error } = await supabase.from("market_listings").select(COLS).eq("estimation_id", estimationId);
    if (error) throw error;
    return (data ?? []).map(rowToListing);
}

export async function setListingSelected(id: string, selected: boolean) {
    const { error } = await supabase.from("market_listings").update({ selected }).eq("id", id);
    if (error) throw error;
}

export async function deleteListing(id: string) {
    const { error } = await supabase.from("market_listings").delete().eq("id", id);
    if (error) throw error;
}

/** Photo d'une annonce retenue, copiée via le serveur (les images des portails ne sont pas lisibles directement) */
export async function fetchListingPhoto(url: string): Promise<File | null> {
    try {
        const res = await fetch(`/api/annonces/photo?url=${encodeURIComponent(url)}`, { headers: await authHeader() });
        if (!res.ok) return null;
        const blob = await res.blob();
        return new File([blob], "annonce.jpg", { type: blob.type || "image/jpeg" });
    } catch {
        return null;
    }
}
