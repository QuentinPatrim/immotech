import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authGuard";
import { ensureModel, getCatalog, isModelId } from "@/lib/plan3d/modelLibrary";

/* ============================================================
   API : /api/plan3d/models
   GET            → catalogue de meubles 3D { items }
   GET ?id=<id>   → { url } du glTF (copié dans notre stockage au 1er appel)
   Réservé aux utilisateurs connectés.
   ============================================================ */

export const maxDuration = 60;

export async function GET(request: Request) {
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;
    const id = new URL(request.url).searchParams.get("id");
    try {
        if (id) {
            if (!isModelId(id)) return NextResponse.json({ error: "Modèle inconnu." }, { status: 400 });
            return NextResponse.json({ url: await ensureModel(id) });
        }
        const catalog = await getCatalog();
        return NextResponse.json({ items: catalog.items }, { headers: { "Cache-Control": "private, max-age=3600" } });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Bibliothèque indisponible." }, { status: 502 });
    }
}
