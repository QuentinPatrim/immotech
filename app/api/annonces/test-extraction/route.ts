import { NextResponse } from "next/server";
import { extractListings, type SubjectProperty } from "@/lib/listingExtraction";
import type { CapturePayload } from "@/lib/marketListings";

// TEMPORAIRE : validation de l'extraction IA sur la préproduction (supprimé avant la mise en production)
export const maxDuration = 60;

const subject: SubjectProperty = {
    propertyType: "Appartement", surface: 68, rooms: 3, city: "Toulouse", address: "45 Allées Jean Jaurès, 31000 Toulouse",
    features: ["Balcon", "Ascenseur", "Cave"], dpe: "D", floor: "3e étage", lowPrice: 285000, highPrice: 305000,
};
const now = new Date().toISOString();

const results: CapturePayload = {
    v: 1, url: "https://www.leboncoin.fr/recherche?category=9&locations=Toulouse_31000&real_estate_type=2&rooms=3-3", title: "Ventes immobilières Appartement 3 pièces Toulouse - leboncoin", host: "www.leboncoin.fr", capturedAt: now,
    cards: [
        { href: "https://www.leboncoin.fr/ad/ventes_immobilieres/2890000001", img: "https://img.leboncoin.fr/api/v1/lbcpb1/images/aa/bb/1.jpg", text: "Appartement T3 lumineux avec balcon - Jean Jaurès 3 pièces · 66 m² 289 000 € 305 000 € Baisse de prix Toulouse 31000 Jean Jaurès Pro Hier à 18:42" },
        { href: "https://www.leboncoin.fr/ad/ventes_immobilieres/2890000002", img: "https://img.leboncoin.fr/api/v1/lbcpb1/images/aa/bb/2.jpg", text: "Bel appartement 3 pièces terrasse parking 3 pièces · 71 m² 315 000 € Toulouse 31500 Saint-Aubin - Dupuy Particulier 12 septembre" },
        { href: "https://www.leboncoin.fr/ad/ventes_immobilieres/2890000003", img: "https://img.leboncoin.fr/api/v1/lbcpb1/images/aa/bb/3.jpg", text: "T3 à rénover RDC sur cour Matabiau 3 pièces · 64 m² 262 000 € Classe énergie F Toulouse 31000 Matabiau Pro Aujourd'hui, 09:15" },
        { href: "https://www.leboncoin.fr/ad/locations/2890000004", img: "https://img.leboncoin.fr/api/v1/lbcpb1/images/aa/bb/4.jpg", text: "Location T3 meublé Carmes 3 pièces · 62 m² 1 150 € charges comprises Toulouse 31000 Carmes Pro 20 septembre" },
        { href: "https://www.leboncoin.fr/ad/ventes_immobilieres/2890000005", text: "Appartement 3 pièces 69 m² dernier étage vue Garonne, ascenseur, 2 chambres 339 000 € DPE C Toulouse 31300 Saint-Cyprien Particulier 3 août" },
    ],
    text: "Ventes immobilières Appartement 3 pièces Toulouse 214 annonces Trier : Plus récentes …",
    jsonLd: [], meta: { ogTitle: "Ventes immobilières Toulouse" }, images: [],
};

const detail: CapturePayload = {
    v: 1, url: "https://www.seloger.com/annonces/achat/appartement/toulouse-31/jean-jaures/228000001.htm", title: "Vente appartement 3 pièces 66 m² Toulouse 31000 - 289 000 € - SeLoger", host: "www.seloger.com", capturedAt: now,
    cards: [
        { href: "https://www.seloger.com/annonces/achat/appartement/toulouse-31/228000011.htm", text: "Appartement 3 pièces 70 m² 299 000 € Toulouse (31000)" },
        { href: "https://www.seloger.com/annonces/achat/appartement/toulouse-31/228000012.htm", text: "Appartement 3 pièces 58 m² 245 000 € Toulouse (31500)" },
        { href: "https://www.seloger.com/annonces/achat/appartement/toulouse-31/228000013.htm", text: "Appartement 4 pièces 82 m² 355 000 € Toulouse (31000)" },
    ],
    text: `Appartement à vendre Toulouse 31000 Jean Jaurès. 3 pièces 2 chambres 66 m² Étage 3/5. 289 000 € 305 000 € (−5 %) Le prix a baissé. Soit 4 379 €/m².
Description : Au cœur du quartier Jean Jaurès, dans un immeuble toulousain en briques de 1930 avec ascenseur, appartement traversant de 66 m² au 3e étage : entrée, séjour de 28 m² ouvrant sur un balcon filant plein sud de 9 m², cuisine séparée aménagée, deux chambres, salle d'eau, WC séparés. Parquet ancien, moulures, double vitrage. Cave. Pas de place de parking. Copropriété de 18 lots, charges 1 450 €/an. Taxe foncière 1 100 €.
Diagnostic de performance énergétique : C (132 kWh/m²/an). GES : B.
Annonce publiée le 22/08/2026, mise à jour le 23/09/2026. Référence : SL-228000001. Agence Pierre & Brique Toulouse.
Annonces similaires : Appartement 3 pièces 70 m² 299 000 € … Appartement 3 pièces 58 m² 245 000 € … Appartement 4 pièces 82 m² 355 000 € …
Mentions légales · Plan du site · Estimation immobilière gratuite · Acheter à Toulouse · Prix m² Toulouse · Nos conseils pour acheter · Financer son achat · Assurance emprunteur · Simulateur de prêt · Frais de notaire`,
    jsonLd: [JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: "Appartement 3 pièces 66 m²", offers: { "@type": "Offer", price: 289000, priceCurrency: "EUR" } })],
    meta: { ogTitle: "Appartement 3 pièces 66 m² - Toulouse", ogImage: "https://v.seloger.com/s/width/800/visuels/1/a/b/c/1abc.jpg", ogDescription: "Appartement traversant avec balcon plein sud, ascenseur, cave." },
    images: [],
};

export async function GET() {
    if (process.env.VERCEL_ENV !== "preview") return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const t0 = Date.now();
    const [r, d] = await Promise.all([extractListings(results, subject), extractListings(detail, subject)]);
    return NextResponse.json({ ms: Date.now() - t0, results: r, detail: d });
}
