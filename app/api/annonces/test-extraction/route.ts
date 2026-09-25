import { NextResponse } from "next/server";
import { extractListings, type SubjectProperty } from "@/lib/listingExtraction";
import type { CapturePayload } from "@/lib/marketListings";

// TEMPORAIRE : validation du jugement « même quartier » (préproduction uniquement)
export const maxDuration = 60;

const subject: SubjectProperty = {
    propertyType: "Appartement", surface: 68, rooms: 3, city: "Toulouse", address: "45 Allées Jean Jaurès, 31000 Toulouse",
    features: [], lowPrice: 285000, highPrice: 305000,
};
const cards = [
    "Appartement 3 pièces 66 m² 289 000 € Toulouse 31000 Jean Jaurès",
    "Appartement 3 pièces 71 m² 315 000 € Toulouse 31500 Saint-Aubin",
    "Appartement 3 pièces 64 m² 262 000 € Toulouse 31000 Matabiau",
    "Appartement 3 pièces 69 m² 339 000 € Toulouse 31300 Saint-Cyprien",
    "Appartement 3 pièces 67 m² 259 000 € Blagnac 31700",
    "Appartement 3 pièces 65 m² 199 000 € Toulouse 31100 Mirail",
    "Appartement 3 pièces 70 m² 305 000 € Toulouse 31000 Capitole",
    "Appartement 3 pièces 68 m² 265 000 € Toulouse 31200 Minimes",
];
const payload: CapturePayload = {
    v: 1, url: "https://www.leboncoin.fr/recherche?x=1", title: "Ventes Toulouse", host: "www.leboncoin.fr", capturedAt: new Date().toISOString(),
    cards: cards.map((text, i) => ({ href: `https://www.leboncoin.fr/ad/ventes_immobilieres/99900000${i}`, text })),
    text: "Ventes immobilières Toulouse", jsonLd: [], meta: {}, images: [],
};

export async function GET() {
    if (process.env.VERCEL_ENV !== "preview") return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const r = await extractListings(payload, subject);
    return NextResponse.json(r.map(x => `${x.district || x.city} → ${x.sameArea}`));
}
