import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authGuard";
import { planFromModel, readPlanImage } from "@/lib/plan3d/extract";
import type { ExtractResponse } from "@/lib/plan3d/types";

/* ============================================================
   API : /api/plan3d/extract
   Lecture d'un plan 2D (image) par l'IA → Plan3D en mètres,
   calé sur l'image d'origine.
   POST { image (URL https ou data:image/...;base64), width, height,
          surface?, rooms?, propertyType? }
   Réponse : ExtractResponse { success, plan, notes } ou { error }.
   ============================================================ */

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_SIDE_PX = 12000;
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

const fail = (error: string, status: number, notes?: string[]) =>
    NextResponse.json<ExtractResponse>({ success: false, error, ...(notes ? { notes } : {}) }, { status });

function isHttpsUrl(v: string) {
    if (v.length > 4096) return false;
    try { return new URL(v).protocol === "https:"; } catch { return false; }
}

/** Nombre positif borné (accepte aussi « 68 » ou « 68,5 » envoyés en texte) */
function positive(v: unknown, max: number) {
    const n = typeof v === "string" ? Number(v.trim().replace(",", ".")) : v;
    return typeof n === "number" && Number.isFinite(n) && n > 0 && n <= max ? n : undefined;
}
const side = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v > 0 && v <= MAX_SIDE_PX ? v : null);

export async function POST(request: Request) {
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;

    let body: Record<string, unknown>;
    try {
        const json: unknown = await request.json();
        if (!json || typeof json !== "object") return fail("Requête invalide.", 400);
        body = json as Record<string, unknown>;
    } catch {
        return fail("Requête invalide.", 400);
    }

    const image = typeof body.image === "string" ? body.image.trim() : "";
    const isUrl = isHttpsUrl(image);
    if (!isUrl) {
        if (!DATA_URL.test(image)) return fail("Image du plan invalide (PNG, JPEG ou WebP attendu).", 400);
        const base64 = image.slice(image.indexOf(",") + 1);
        if ((base64.length * 3) / 4 > MAX_IMAGE_BYTES) return fail("Image du plan trop lourde (12 Mo maximum).", 413);
    }
    const width = side(body.width), height = side(body.height);
    if (!width || !height) return fail("Dimensions de l'image invalides.", 400);

    if (!process.env.OPENAI_API_KEY) return fail("Service d'analyse indisponible.", 500);

    const surface = positive(body.surface, 5000);
    const rooms = positive(body.rooms, 50);
    const propertyType = typeof body.propertyType === "string" ? body.propertyType.trim().slice(0, 40) || undefined : undefined;

    try {
        const model = await readPlanImage(image, { surface, rooms: rooms ? Math.round(rooms) : undefined, propertyType });
        const { plan, notes } = planFromModel(model, { widthPx: width, heightPx: height, declaredSurface: surface, imageUrl: isUrl ? image : undefined });
        if (!plan.rooms.length) {
            return fail("Aucune pièce détectée sur ce plan. Essayez une image plus nette ou créez le plan à partir des surfaces.", 422, notes);
        }
        return NextResponse.json<ExtractResponse>({ success: true, plan, notes });
    } catch (error) {
        console.error("Erreur lecture du plan 3D :", error);
        return fail("La lecture du plan a échoué. Réessayez dans un instant.", 500);
    }
}
