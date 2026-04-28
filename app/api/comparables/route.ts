import { NextResponse } from 'next/server';

// Formule mathématique pour calculer la distance exacte (en mètres) entre deux points GPS
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Rayon de la Terre en mètres
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Fonction de sécurité pour empêcher les serveurs de l'État de faire planter l'application
async function fetchWithTimeout(resource: string, options: any = {}) {
    const { timeout = 8000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

export async function POST(request: Request) {
    try {
        const { address, surface, propertyType, radius = 500 } = await request.json();
        
        if (!address || !surface) {
            return NextResponse.json({ error: 'Adresse ou surface manquante' }, { status: 400 });
        }

        // 1. Géolocalisation exacte pour obtenir les coordonnées
        const geoRes = await fetchWithTimeout(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`, { timeout: 5000 });
        const geoData = await geoRes.json();
        
        if (!geoData.features || geoData.features.length === 0) {
            return NextResponse.json({ error: 'Adresse introuvable en France' }, { status: 404 });
        }

        const [lon, lat] = geoData.features[0].geometry.coordinates;
        const citycode = geoData.features[0].properties.citycode;
        const city = geoData.features[0].properties.city;

        let comparables = [];
        const typeMatcher = propertyType.toLowerCase().includes("appartement") ? "Appartement" : "Maison";
        
        const now = new Date();
        const oneYearAgo = new Date(); oneYearAgo.setFullYear(now.getFullYear() - 1);
        const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(now.getFullYear() - 2);
        const threeYearsAgo = new Date(); threeYearsAgo.setFullYear(now.getFullYear() - 3);

        // =================================================================
        // MOTEUR 1 : CQUEST (Ultra-rapide, filtrage spatial côté serveur)
        // =================================================================
        try {
            const dvfRes = await fetchWithTimeout(`https://api.cquest.org/dvf?lat=${lat}&lon=${lon}&dist=${radius}`, { timeout: 6000 });
            if (dvfRes.ok) {
                const dvfData = await dvfRes.json();
                if (dvfData.features && dvfData.features.length > 0) {
                    const validSales = dvfData.features.filter((f: any) => {
                        const p = f.properties;
                        if (p.nature_mutation !== "Vente" || p.valeur_fonciere < 10000) return false;
                        if (p.type_local !== typeMatcher) return false;
                        // Tolérance de +/- 30% sur la surface pour trouver plus de biens
                        if (p.surface_reelle_bati < surface * 0.70 || p.surface_reelle_bati > surface * 1.30) return false; 
                        return true;
                    });

                    // On cherche d'abord < 1 an, sinon < 2 ans, etc.
                    let selectedSales = validSales.filter((f: any) => new Date(f.properties.date_mutation) >= oneYearAgo);
                    if (selectedSales.length < 3) selectedSales = validSales.filter((f: any) => new Date(f.properties.date_mutation) >= twoYearsAgo);
                    if (selectedSales.length < 3) selectedSales = validSales.filter((f: any) => new Date(f.properties.date_mutation) >= threeYearsAgo);
                    if (selectedSales.length < 3) selectedSales = validSales;

                    selectedSales.sort((a: any, b: any) => new Date(b.properties.date_mutation).getTime() - new Date(a.properties.date_mutation).getTime());
                    
                    comparables = selectedSales.slice(0, 3).map((f: any, index: number) => {
                        const p = f.properties;
                        const addr = `${p.numero_voie ? p.numero_voie + ' ' : ''}${p.type_voie || ''} ${p.voie || ''}, ${city}`.trim();
                        const dateStr = new Date(p.date_mutation).toLocaleDateString('fr-FR');
                        return {
                            id: `dvf-cq-${Date.now()}-${index}`,
                            address: addr.replace(/^, /, '') + ` (Vendu le ${dateStr})`,
                            surface: p.surface_reelle_bati,
                            price: p.valeur_fonciere,
                            lat: f.geometry.coordinates[1],
                            lon: f.geometry.coordinates[0]
                        };
                    });
                }
            }
        } catch (e) {
            console.log("Le moteur Cquest est surchargé, bascule sur Etalab...");
        }

        // =================================================================
        // MOTEUR 2 : ETALAB (Serveur de l'État, si Cquest a échoué)
        // =================================================================
        if (comparables.length === 0) {
            try {
                // On limite le temps à 8 secondes pour ne pas faire crasher ton interface
                const etalabRes = await fetchWithTimeout(`https://app.dvf.etalab.gouv.fr/api/mutations3/?code_commune=${citycode}`, { timeout: 8000 });
                if (etalabRes.ok) {
                    const etalabData = await etalabRes.json();
                    if (etalabData && etalabData.mutations) {
                        const validSales = etalabData.mutations.filter((m: any) => {
                            if (m.nature_mutation !== "Vente" || m.valeur_fonciere < 10000) return false;
                            if (m.type_local !== typeMatcher) return false;
                            if (m.surface_reelle_bati < surface * 0.70 || m.surface_reelle_bati > surface * 1.30) return false;
                            
                            if (!m.latitude || !m.longitude) return false;
                            const dist = getDistance(lat, lon, m.latitude, m.longitude);
                            if (dist > radius) return false;

                            return true;
                        });

                        let selectedSales = validSales.filter((m: any) => new Date(m.date_mutation) >= oneYearAgo);
                        if (selectedSales.length < 3) selectedSales = validSales.filter((m: any) => new Date(m.date_mutation) >= twoYearsAgo);
                        if (selectedSales.length < 3) selectedSales = validSales.filter((m: any) => new Date(m.date_mutation) >= threeYearsAgo);
                        if (selectedSales.length < 3) selectedSales = validSales;

                        selectedSales.sort((a: any, b: any) => new Date(b.date_mutation).getTime() - new Date(a.date_mutation).getTime());
                        
                        comparables = selectedSales.slice(0, 3).map((m: any, index: number) => {
                            const addr = `${m.adresse_numero ? m.adresse_numero + ' ' : ''}${m.adresse_nom_voie || ''}, ${m.nom_commune}`.trim();
                            const dateStr = new Date(m.date_mutation).toLocaleDateString('fr-FR');
                            return {
                                id: `dvf-eta-${Date.now()}-${index}`,
                                address: addr + ` (Vendu le ${dateStr})`,
                                surface: m.surface_reelle_bati,
                                price: m.valeur_fonciere,
                                lat: m.latitude,
                                lon: m.longitude
                            };
                        });
                    }
                }
            } catch (e) {
                console.log("Le moteur Etalab n'a pas pu répondre dans le temps imparti.");
            }
        }

        // --- VERDICT ---
        if (comparables.length === 0) {
            return NextResponse.json({ error: `Aucun(e) ${propertyType.toLowerCase()} similaire trouvé(e) dans ce rayon précis de ${radius}m (ou serveurs DVF surchargés). Veuillez élargir le rayon ou ajouter manuellement.` }, { status: 404 });
        }

        // 3. Injection de la photo Google Street View
        const GOOGLE_KEY = process.env.GOOGLE_STREET_VIEW_KEY;
        const finalComparables = comparables.map((comp: { lat: any; lon: any; }) => {
            return {
                ...comp,
                photoUrl: GOOGLE_KEY ? `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${comp.lat},${comp.lon}&fov=90&pitch=0&key=${GOOGLE_KEY}` : ""
            };
        });

        return NextResponse.json({ success: true, comparables: finalComparables });

    } catch (error: any) {
        console.error("Erreur Moteur Comparables:", error);
        return NextResponse.json({ error: "Erreur de traitement des données DVF." }, { status: 500 });
    }
}