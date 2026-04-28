"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // useRouter pour le bouton retour
import { supabase } from "@/lib/supabaseClient";
import {
    QrCode, Image as ImageIcon, Calculator, UploadCloud,
    X, Plus, Loader2, Download, ArrowLeft, Banknote, Home, Layers, Globe, Wand2,
    Printer, Globe2, Sparkles, Copy, Check, Link2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const COLORS = {
    primary: "#8a0e01",
    secondary: "#d35f52",
};

export default function GenerateurQR() {
    const router = useRouter();
    // --- LECTURE DE L'ID (MÉMOIRE) ---
    // L'URL accepte ?qr_id=xxx (depuis /mes-biens) pour rouvrir un QR existant.
    // On garde aussi ?id=xxx comme alias pour rétrocompatibilité.
    const searchParams = useSearchParams();
    const editId = searchParams.get("qr_id") || searchParams.get("id");

    const [loading, setLoading] = useState(false);
    const [generatedId, setGeneratedId] = useState<string | null>(null);
    const [domain, setDomain] = useState("");
    const [uploadingPhotos, setUploadingPhotos] = useState(false);

    // --- SHORT LINKS (URLs courtes pour chaque type) ---
    const [shortLinks, setShortLinks] = useState<{
        simulation?: { slug: string; shortUrl: string };
        galerie?: { slug: string; shortUrl: string };
    }>({});
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // --- MODULE D'IMPORTATION WEB ---
    const [listingUrl, setListingUrl] = useState("");
    const [isScraping, setIsScraping] = useState(false);

    // --- FORMULAIRE EXPRESS ---
    const [address, setAddress] = useState("");
    const [propertyType, setPropertyType] = useState("Appartement");
    const [rooms, setRooms] = useState<number | "">("");
    const [surface, setSurface] = useState<number | "">("");
    
    const [priceFAI, setPriceFAI] = useState<number | "">("");
    const [taxeFonciere, setTaxeFonciere] = useState<number | "">("");
    const [coproFees, setCoproFees] = useState<number | "">("");
    const [monthlyRent, setMonthlyRent] = useState<number | "">("");

    const [mainPhoto, setMainPhoto] = useState<string>("");
    const [extraPhotos, setExtraPhotos] = useState<string[]>([]);

    useEffect(() => {
        if (typeof window !== "undefined") setDomain(window.location.origin);
        
        // S'il y a un ID, on charge les données existantes pour les modifier !
        if (editId) {
            loadExistingData(editId);
        }
    }, [editId]);

    // --- CHARGEMENT DES DONNÉES EXISTANTES (depuis la table qr_codes) ---
    const loadExistingData = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('qr_codes')
            .select('*')
            .eq('id', id)
            .single();

        if (data) {
            // La table qr_codes stocke les champs à plat (plus propre que JSON)
            setAddress(data.address || "");
            setPropertyType(data.property_type || "Appartement");
            setRooms(data.rooms || "");
            setSurface(data.surface || "");
            setPriceFAI(data.price_fai || "");
            setTaxeFonciere(data.taxe_fonciere || "");
            setCoproFees(data.copro_fees || "");
            setMonthlyRent(data.monthly_rent || "");
            setMainPhoto(data.main_photo || "");
            setExtraPhotos(data.extra_photos || []);
            setGeneratedId(id);

            // Régénérer les short_links pour pouvoir les retélécharger
            await createShortLinks(id);
        }
        setLoading(false);
    };

    // --- FONCTION D'IMPORTATION WEB ---
    const handleImportFromUrl = async () => {
        if (!listingUrl) return alert("Veuillez coller un lien valide.");
        setIsScraping(true);
        
        try {
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: listingUrl })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.title) setAddress(data.title);
                if (data.price) setPriceFAI(data.price);
                if (data.photos && data.photos.length > 0) {
                    setMainPhoto(data.photos[0]);
                    if (data.photos.length > 1) {
                        setExtraPhotos(data.photos.slice(1, 9));
                    }
                }
                alert(`Importation réussie ! \n\nPrix trouvé : ${data.price ? data.price + ' €' : 'Non trouvé'}\nPhotos trouvées : ${data.photos?.length || 0}\n\nVérifiez les données et ajoutez la surface et les pièces.`);
            } else {
                alert("Erreur: " + data.error);
            }
        } catch (error) {
            alert("Erreur de connexion. Le site de votre agence bloque peut-être la lecture automatique.");
        }

        setIsScraping(false);
    };

    // --- UPLOAD PHOTOS ---
    const compressImage = (file: File, maxWidthPx = 1600, quality = 0.82): Promise<Blob> =>
        new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const scale = Math.min(1, maxWidthPx / img.width);
                const canvas = document.createElement('canvas');
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(b => resolve(b!), 'image/jpeg', quality);
                URL.revokeObjectURL(url);
            };
            img.src = url;
        });

    const uploadToStorage = async (file: File): Promise<string | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const compressed = await compressImage(file);
        const path = `${user.id}/qr-express/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error } = await supabase.storage.from('estimation-photos').upload(path, compressed, { contentType: 'image/jpeg' });
        if (error) return null;
        const { data: urlData } = supabase.storage.from('estimation-photos').getPublicUrl(path);
        return urlData.publicUrl;
    };

    const handleMainPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingPhotos(true);
        const url = await uploadToStorage(file);
        if (url) setMainPhoto(url);
        setUploadingPhotos(false);
    };

    const handleExtraPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setUploadingPhotos(true);
        const urls = await Promise.all(files.map(f => uploadToStorage(f)));
        const validUrls = urls.filter(Boolean) as string[];
        setExtraPhotos(prev => [...prev, ...validUrls]);
        setUploadingPhotos(false);
    };

    // --- GÉNÉRATION ET SAUVEGARDE (AVEC MÉMOIRE) ---
    const handleGenerate = async () => {
        if (!priceFAI || !address) return alert("Veuillez renseigner au moins l'adresse et le prix.");
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Payload pour la table qr_codes (champs à plat, pas dans un JSON)
        const qrPayload = {
            user_id: user.id,
            address: address,
            price_fai: Number(priceFAI) || null,
            property_type: propertyType,
            rooms: Number(rooms) || null,
            surface: Number(surface) || null,
            main_photo: mainPhoto || null,
            extra_photos: extraPhotos,
            taxe_fonciere: Number(taxeFonciere) || null,
            copro_fees: Number(coproFees) || null,
            monthly_rent: Number(monthlyRent) || null,
            // Conservation d'un data_json pour flexibilité future
            data_json: {
                commercialSettings: { sellingPriceFAI: Number(priceFAI) },
                isCopropriete: Number(coproFees) > 0,
                dpe: "C", ges: "A",
            },
        };

        if (editId) {
            // --- MODE ÉDITION : Mise à jour du QR existant ---
            const { error } = await supabase
                .from('qr_codes')
                .update(qrPayload)
                .eq('id', editId);

            if (!error) {
                setGeneratedId(editId);
                await createShortLinks(editId);
            } else {
                console.error(error);
                alert("Erreur lors de la mise à jour.");
            }
        } else {
            // --- MODE CRÉATION : Nouveau QR code ---
            const { data, error } = await supabase
                .from('qr_codes')
                .insert(qrPayload)
                .select('id')
                .single();

            if (data) {
                setGeneratedId(data.id);
                await createShortLinks(data.id);
            } else {
                console.error(error);
                alert("Erreur lors de la génération.");
            }
        }

        setLoading(false);
    };

    // --- CRÉATION DES URLS COURTES (pour un QR code) ---
    const createShortLinks = async (qrCodeId: string) => {
        const origin = domain || (typeof window !== "undefined" ? window.location.origin : "");

        const createOne = async (kind: "simulation" | "galerie", targetPath: string) => {
            try {
                const targetUrl = `${origin}${targetPath}`;
                const res = await fetch('/api/shortlinks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // On passe maintenant qrCodeId (plus estimationId) pour ce générateur
                    body: JSON.stringify({ targetUrl, qrCodeId, kind }),
                });
                const json = await res.json();
                if (json.slug) {
                    return { slug: json.slug, shortUrl: `${origin}/s/${json.slug}` };
                }
            } catch (e) {
                console.error(`[shortlinks] création ${kind} échouée:`, e);
            }
            return undefined;
        };

        // Les URLs longues restent /simulation/[id] et /galerie/[id]
        // Les pages de simulation/galerie devront apprendre à lire aussi
        // depuis qr_codes en plus d'estimations (voir Étape 4)
        const simuTarget = `/simulation/${qrCodeId}?price=${Number(priceFAI)}`;
        const galerieTarget = `/galerie/${qrCodeId}`;

        const [simulation, galerie] = await Promise.all([
            createOne("simulation", simuTarget),
            createOne("galerie", galerieTarget),
        ]);

        setShortLinks({ simulation, galerie });
    };

    // --- HELPER : copier dans le presse-papier avec feedback visuel ---
    const copyToClipboard = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch {}
            document.body.removeChild(ta);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        }
    };

    // --- FONCTION CŒUR : DESSINER UNE CARTE SUR UN CANVAS ---
    const drawCardOnContext = async (
        ctx: CanvasRenderingContext2D, 
        xOffset: number, 
        yOffset: number, 
        type: "SIMULATION" | "GALERIE",
        qrUrl: string
    ) => {
        const cardWidth = 1000;
        const cardHeight = 450;
        const isSimu = type === "SIMULATION";
        const mainColor = isSimu ? COLORS.primary : COLORS.secondary;
        const titleL1 = isSimu ? "SIMULATEUR" : "GALERIE";
        const titleL2 = isSimu ? "DE PRÊT" : "PHOTOS";
        const subL1 = isSimu ? "SIMULEZ VOTRE CRÉDIT ET" : "FLASHEZ POUR VISITER LE";
        const subL2 = isSimu ? "CALCULEZ VOTRE RENTABILITÉ" : "BIEN AVEC NOS PHOTOS";

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(xOffset, yOffset, cardWidth, cardHeight);
        ctx.fillStyle = mainColor;
        ctx.fillRect(xOffset, yOffset, cardWidth, 30);
        ctx.textAlign = "left";
        ctx.fillStyle = "#111111";
        ctx.font = "900 70px Arial, sans-serif";
        ctx.fillText(titleL1, xOffset + 420, yOffset + 160);
        ctx.fillText(titleL2, xOffset + 420, yOffset + 240);
        ctx.fillStyle = mainColor;
        ctx.font = "bold 30px Arial, sans-serif";
        ctx.fillText(subL1, xOffset + 425, yOffset + 330);
        ctx.fillText(subL2, xOffset + 425, yOffset + 375);

        if (address) {
            ctx.textAlign = "right";
            ctx.fillStyle = "#888888";
            ctx.font = "italic 16px Arial, sans-serif";
            ctx.fillText(address, xOffset + 970, yOffset + 430);
        }

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&margin=0`;

        return new Promise<void>((resolve, reject) => {
            img.onload = () => {
                ctx.drawImage(img, xOffset + 70, yOffset + 70, 310, 310);
                resolve();
            };
            img.onerror = reject;
        });
    };

    const downloadSingleQR = async (qrDataUrl: string, type: "SIMULATION" | "GALERIE") => {
        const canvas = document.createElement("canvas");
        canvas.width = 1000;
        canvas.height = 450;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await drawCardOnContext(ctx, 0, 0, type, qrDataUrl);
        const link = document.createElement("a");
        link.download = `Patrim_QR_Express_${type}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    const qrImageUrl = (data: string, size: number) =>
        `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=0`;

    const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) => {
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    const fitText = (
        ctx: CanvasRenderingContext2D, text: string, maxWidth: number,
        maxFontSize: number, minFontSize: number, fontWeight: string, fontFamily: string,
    ): number => {
        let size = maxFontSize;
        ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
        while (ctx.measureText(text).width > maxWidth && size > minFontSize) {
            size -= 2;
            ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
        }
        return size;
    };

    const drawLogo = async (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, targetWidth: number, onDarkBackground: boolean = false): Promise<boolean> => {
        try {
            const logo = await loadImage('/logo-patrim.png');
            const ratio = logo.height / logo.width;
            const drawWidth = targetWidth; const drawHeight = targetWidth * ratio;
            const x = centerX - drawWidth / 2; const y = centerY - drawHeight / 2;
            if (onDarkBackground) {
                ctx.save(); ctx.shadowColor = 'rgba(255, 255, 255, 0.95)'; ctx.shadowBlur = 24; ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
                roundRect(ctx, x - 20, y - 12, drawWidth + 40, drawHeight + 24, 12); ctx.fill(); ctx.restore();
            }
            ctx.drawImage(logo, x, y, drawWidth, drawHeight);
            return true;
        } catch (e) {
            return false;
        }
    };

    /* ---------- FORMAT PRINT (1200×1200) ---------- */
    const downloadPrintFormat = async (kind: "simulation" | "galerie") => {
        const shortInfo = shortLinks[kind];
        if (!shortInfo) return alert("Lien court non disponible.");
        const isSimu = kind === "simulation"; const mainColor = isSimu ? COLORS.primary : COLORS.secondary;
        const title = isSimu ? "SIMULATEUR DE PRÊT" : "GALERIE PHOTOS";
        const sub = isSimu ? "Scannez pour simuler votre crédit" : "Scannez pour voir toutes les photos";

        const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 1200;
        const ctx = canvas.getContext("2d"); if (!ctx) return;

        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 1200, 1200);
        ctx.fillStyle = mainColor; ctx.fillRect(0, 0, 1200, 60);

        const logoLoaded = await drawLogo(ctx, 600, 150, 260, false);
        if (!logoLoaded) { ctx.fillStyle = "#111111"; ctx.font = "900 42px Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText("PATRIM", 600, 165); }

        ctx.fillStyle = mainColor; ctx.font = "bold 22px Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText(title, 600, 220);

        try { const qrImg = await loadImage(qrImageUrl(shortInfo.shortUrl, 800)); ctx.drawImage(qrImg, 200, 270, 800, 800); } catch (e) {}

        ctx.fillStyle = "#111111"; ctx.font = "bold 32px Arial, sans-serif"; ctx.fillText(sub, 600, 1115);
        const urlText = shortInfo.shortUrl.replace(/^https?:\/\//, '');
        const urlSize = fitText(ctx, urlText, 1000, 30, 16, "900", "monospace");
        ctx.fillStyle = mainColor; ctx.font = `900 ${urlSize}px monospace`; ctx.fillText(urlText, 600, 1160);

        if (address) { ctx.fillStyle = "#888888"; ctx.font = "italic 16px Arial, sans-serif"; const addrText = address.length > 70 ? address.substring(0, 70) + "…" : address; ctx.fillText(addrText, 600, 1190); }
        downloadCanvas(canvas, `Patrim_PRINT_${kind}_${shortInfo.slug}.png`);
    };

    /* ---------- FORMAT WEB (1200×630) ---------- */
    const downloadWebFormat = async (kind: "simulation" | "galerie") => {
        const shortInfo = shortLinks[kind];
        if (!shortInfo) return alert("Lien court non disponible.");
        const isSimu = kind === "simulation"; const mainColor = isSimu ? COLORS.primary : COLORS.secondary;
        const titleL1 = isSimu ? "SIMULEZ VOTRE" : "DÉCOUVREZ LE BIEN"; const titleL2 = isSimu ? "MENSUALITÉ" : "EN PHOTOS";
        const sub = isSimu ? "Calculez votre crédit en 30 secondes" : "Toutes les photos HD, en un clin d'œil";

        const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 630;
        const ctx = canvas.getContext("2d"); if (!ctx) return;

        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 1200, 630);
        ctx.fillStyle = mainColor; ctx.fillRect(0, 0, 1200, 10);

        try { const qrImg = await loadImage(qrImageUrl(shortInfo.shortUrl, 460)); ctx.drawImage(qrImg, 70, 90, 460, 460); } catch (e) {}

        ctx.fillStyle = "#666666"; ctx.font = "bold 14px Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText("SCANNEZ", 300, 585);

        const textZoneLeft = 580; const textZoneRight = 1150; const textZoneWidth = textZoneRight - textZoneLeft;
        ctx.textAlign = "left";
        const logoLoaded = await drawLogoLeftAligned(ctx, textZoneLeft, 95, 160, false);
        if (!logoLoaded) { ctx.fillStyle = mainColor; ctx.font = "900 22px Arial, sans-serif"; ctx.fillText("PATRIM", textZoneLeft, 120); }

        ctx.fillStyle = "#111111";
        const titleSize1 = fitText(ctx, titleL1, textZoneWidth, 56, 40, "900", "Arial, sans-serif"); ctx.font = `900 ${titleSize1}px Arial, sans-serif`; ctx.fillText(titleL1, textZoneLeft, 210);
        const titleSize2 = fitText(ctx, titleL2, textZoneWidth, 56, 40, "900", "Arial, sans-serif"); ctx.font = `900 ${titleSize2}px Arial, sans-serif`; ctx.fillText(titleL2, textZoneLeft, 270);

        ctx.fillStyle = mainColor; const subSize = fitText(ctx, sub, textZoneWidth, 20, 14, "bold", "Arial, sans-serif"); ctx.font = `bold ${subSize}px Arial, sans-serif`; ctx.fillText(sub, textZoneLeft, 315);

        ctx.strokeStyle = "#e4e4e7"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(textZoneLeft, 360); ctx.lineTo(textZoneRight, 360); ctx.stroke();
        ctx.fillStyle = "#888888"; ctx.font = "bold 14px Arial, sans-serif"; ctx.fillText("OU TAPEZ DIRECTEMENT DANS VOTRE NAVIGATEUR :", textZoneLeft, 395);

        const urlText = shortInfo.shortUrl.replace(/^https?:\/\//, ''); const urlSize = fitText(ctx, urlText, textZoneWidth, 48, 22, "900", "monospace"); ctx.fillStyle = mainColor; ctx.font = `900 ${urlSize}px monospace`; ctx.fillText(urlText, textZoneLeft, 455);

        if (address) { ctx.fillStyle = "#111111"; const addrSize = fitText(ctx, address, textZoneWidth - 180, 18, 12, "bold", "Arial, sans-serif"); ctx.font = `bold ${addrSize}px Arial, sans-serif`; ctx.fillText(address, textZoneLeft, 530); }
        if (priceFAI) { ctx.textAlign = "right"; ctx.fillStyle = mainColor; ctx.font = "900 36px Arial, sans-serif"; ctx.fillText(`${Number(priceFAI).toLocaleString('fr-FR')} €`, textZoneRight, 575); }

        downloadCanvas(canvas, `Patrim_WEB_${kind}_${shortInfo.slug}.png`);
    };

    const drawLogoLeftAligned = async (ctx: CanvasRenderingContext2D, x: number, centerY: number, targetWidth: number, onDarkBackground: boolean = false): Promise<boolean> => {
        try {
            const logo = await loadImage('/logo-patrim.png'); const ratio = logo.height / logo.width;
            const drawWidth = targetWidth; const drawHeight = targetWidth * ratio; const y = centerY - drawHeight / 2;
            if (onDarkBackground) { ctx.save(); ctx.shadowColor = 'rgba(255, 255, 255, 0.95)'; ctx.shadowBlur = 24; ctx.fillStyle = 'rgba(255, 255, 255, 0.98)'; roundRect(ctx, x - 16, y - 10, drawWidth + 32, drawHeight + 20, 10); ctx.fill(); ctx.restore(); }
            ctx.drawImage(logo, x, y, drawWidth, drawHeight); return true;
        } catch { return false; }
    };

    /* ---------- FORMAT TEASER (1080×1920) ---------- */
    const downloadTeaserFormat = async (kind: "simulation" | "galerie") => {
        const shortInfo = shortLinks[kind];
        if (!shortInfo) return alert("Lien court non disponible.");
        if (!mainPhoto) return alert("Aucune photo principale — impossible de créer le teaser.");

        const isSimu = kind === "simulation"; const mainColor = isSimu ? COLORS.primary : COLORS.secondary;
        const bigLabel = isSimu ? "SIMULEZ" : "DÉCOUVREZ"; const bigLabel2 = isSimu ? "VOTRE CRÉDIT" : "LE BIEN";

        const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1920;
        const ctx = canvas.getContext("2d"); if (!ctx) return;

        try {
            const bgImg = await loadImage(mainPhoto); const imgRatio = bgImg.width / bgImg.height; const canvasRatio = 1080 / 1920;
            let drawW = 1080, drawH = 1920, dx = 0, dy = 0;
            if (imgRatio > canvasRatio) { drawH = 1920; drawW = drawH * imgRatio; dx = (1080 - drawW) / 2; } else { drawW = 1080; drawH = drawW / imgRatio; dy = (1920 - drawH) / 2; }
            ctx.drawImage(bgImg, dx, dy, drawW, drawH);
        } catch (e) {
            const gradient = ctx.createLinearGradient(0, 0, 0, 1920); gradient.addColorStop(0, COLORS.primary); gradient.addColorStop(1, COLORS.secondary); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, 1920);
        }

        const overlayGrad = ctx.createLinearGradient(0, 0, 0, 1920); overlayGrad.addColorStop(0, "rgba(0,0,0,0.3)"); overlayGrad.addColorStop(0.5, "rgba(0,0,0,0.55)"); overlayGrad.addColorStop(1, "rgba(0,0,0,0.85)"); ctx.fillStyle = overlayGrad; ctx.fillRect(0, 0, 1080, 1920);

        ctx.textAlign = "center";
        const logoLoaded = await drawLogo(ctx, 540, 130, 240, true);
        if (!logoLoaded) { ctx.fillStyle = "#ffffff"; ctx.font = "900 36px Arial, sans-serif"; ctx.fillText("PATRIM", 540, 140); }

        ctx.fillStyle = mainColor; ctx.fillRect(490, 200, 100, 4);

        if (priceFAI) {
            ctx.fillStyle = "#ffffff"; ctx.font = "900 120px Arial, sans-serif"; ctx.fillText(`${Number(priceFAI).toLocaleString('fr-FR')} €`, 540, 380);
            if (address) { ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "italic 28px Arial, sans-serif"; const addr = address.length > 50 ? address.substring(0, 50) + "…" : address; ctx.fillText(addr, 540, 430); }
        }

        ctx.fillStyle = "#ffffff"; ctx.font = "900 110px Arial, sans-serif"; ctx.fillText(bigLabel, 540, 870); ctx.fillText(bigLabel2, 540, 990);

        const ctaY = 1300; const ctaH = 220; const ctaPadding = 60; const ctaContentWidth = 900 - 2 * ctaPadding;
        ctx.fillStyle = "rgba(255,255,255,0.95)"; roundRect(ctx, 90, ctaY, 900, ctaH, 40); ctx.fill();

        ctx.fillStyle = mainColor; ctx.font = "bold 32px Arial, sans-serif"; ctx.fillText("RENDEZ-VOUS SUR", 540, ctaY + 75);

        const urlText = shortInfo.shortUrl.replace(/^https?:\/\//, ''); const urlSize = fitText(ctx, urlText, ctaContentWidth, 64, 28, "900", "monospace"); ctx.fillStyle = "#111111"; ctx.font = `900 ${urlSize}px monospace`; ctx.fillText(urlText, 540, ctaY + 155);

        try { const qrImg = await loadImage(qrImageUrl(shortInfo.shortUrl, 200)); ctx.fillStyle = "#ffffff"; roundRect(ctx, 430, 1620, 220, 220, 20); ctx.fill(); ctx.drawImage(qrImg, 440, 1630, 200, 200); } catch (e) {}

        ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "bold 20px Arial, sans-serif"; ctx.fillText("ou scannez ↑", 540, 1880);

        downloadCanvas(canvas, `Patrim_TEASER_${kind}_${shortInfo.slug}.png`);
    };

    const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    };

    const downloadCombinedQR = async () => {
        if (!generatedId) return;
        const simuUrl = `${domain}/simulation/${generatedId}`;
        const galerieUrl = `${domain}/galerie/${generatedId}`;
        const spacer = 50;
        const canvas = document.createElement("canvas");
        canvas.width = 1000 + spacer + 1000;
        canvas.height = 450;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#f4f4f5";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await drawCardOnContext(ctx, 0, 0, "SIMULATION", simuUrl);
        await drawCardOnContext(ctx, 1000 + spacer, 0, "GALERIE", galerieUrl);

        const link = document.createElement("a");
        link.download = `Patrim_QR_Express_COMBINE.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    if (loading) return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"><Loader2 className="animate-spin text-[#d35f52] w-10 h-10"/></div>;

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white pb-32">
            {/* Typos unifiées avec /mes-biens : Fraunces (display) + Inter Tight (body) */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Inter+Tight:wght@400;500;600;700;800&display=swap');
                .font-display {
                    font-family: 'Fraunces', serif;
                    font-optical-sizing: auto;
                    font-variation-settings: "SOFT" 50, "WONK" 0;
                }
                .font-body { font-family: 'Inter Tight', sans-serif; }
                .font-sans { font-family: 'Inter Tight', sans-serif; }
            `}}/>

            {/* Header unifié — mêmes proportions que /mes-biens */}
            <div className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5" style={{ backgroundColor: 'rgba(10,10,12,0.85)' }}>
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link
                            href="/mes-biens"
                            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors flex-shrink-0 font-body text-xs font-semibold"
                        >
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                                <ArrowLeft size={14}/>
                            </div>
                            <span className="hidden sm:inline">Mes biens</span>
                        </Link>
                        <div className="h-6 w-px bg-white/10 hidden sm:block"/>
                        <div className="min-w-0">
                            <h1 className="font-display text-xl sm:text-2xl text-white flex items-center gap-2 leading-tight truncate" style={{ fontWeight: 500 }}>
                                <QrCode size={18} className="text-[#d35f52] flex-shrink-0"/>
                                <span className="truncate">{editId ? "Modifier le QR Code" : "Générateur Express"}</span>
                            </h1>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold font-body">QR Code pour mandat</p>
                        </div>
                    </div>
                    <img src="/logo-patrim.png" alt="PATRIM" className="h-7 object-contain opacity-80 flex-shrink-0"/>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 mt-10 font-body">
                {!generatedId ? (
                    <div className="animate-in fade-in duration-300 space-y-10">
                        
                        {/* On masque l'import si on est en train de modifier pour ne pas écraser par erreur */}
                        {!editId && (
                            <div className="bg-gradient-to-r from-[#111114] to-[#1a1a1f] p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-center gap-6">
                                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/5 shrink-0 border border-white/10">
                                    <Globe className="text-[#d35f52]" size={24}/>
                                </div>
                                <div className="flex-1 w-full">
                                    <h2 className="text-sm font-bold text-white mb-1">Importation Magique (Lien Web)</h2>
                                    <p className="text-xs text-zinc-400 mb-3">Collez le lien d'une annonce SeLoger ou LeBonCoin pour pré-remplir ce formulaire et importer les photos.</p>
                                    <div className="flex gap-3 w-full">
                                        <Input 
                                            value={listingUrl} 
                                            onChange={e => setListingUrl(e.target.value)} 
                                            placeholder="https://www.leboncoin.fr/ad/ventes_immobilieres/..." 
                                            className="flex-1 bg-black/50 border-white/20 h-12 text-sm text-white focus:border-[#d35f52]"
                                        />
                                        <Button 
                                            onClick={handleImportFromUrl} 
                                            disabled={isScraping}
                                            className="h-12 px-6 rounded-xl font-bold bg-white text-black hover:bg-zinc-200 transition-colors"
                                        >
                                            {isScraping ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} className="mr-2" />}
                                            {isScraping ? "Aspiration..." : "Importer"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-8">
                                <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#d35f52] flex items-center gap-2"><Home size={16}/> Le Bien</h2>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Adresse ou Quartier (Apparaîtra sur l'image)</label>
                                        <Input value={address} onChange={e=>setAddress(e.target.value)} className="bg-black border-white/10 h-12 text-sm focus:border-[#d35f52]" placeholder="Ex: Jean-Jaurès, Toulouse"/>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Type</label>
                                            <select value={propertyType} onChange={e=>setPropertyType(e.target.value)} className="w-full bg-black border border-white/10 h-12 rounded-xl px-3 text-sm focus:border-[#d35f52] outline-none text-white">
                                                <option>Appartement</option><option>Maison</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Pièces</label>
                                            <Input type="number" value={rooms} onChange={e=>setRooms(Number(e.target.value))} className="bg-black border-white/10 h-12 text-sm"/>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Surface (m²)</label>
                                            <Input type="number" value={surface} onChange={e=>setSurface(Number(e.target.value))} className="bg-black border-white/10 h-12 text-sm"/>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#d35f52] flex items-center gap-2"><Banknote size={16}/> Données Financières</h2>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Prix Affiché FAI (€) *</label>
                                        <Input type="number" value={priceFAI} onChange={e=>setPriceFAI(Number(e.target.value))} className="bg-black border-white/10 h-14 text-xl font-black text-white focus:border-[#d35f52]"/>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Taxe Foncière (€/an)</label>
                                            <Input type="number" value={taxeFonciere} onChange={e=>setTaxeFonciere(Number(e.target.value))} className="bg-black border-white/10 h-12 text-sm"/>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Copropriété (€/mois)</label>
                                            <Input type="number" value={coproFees} onChange={e=>setCoproFees(Number(e.target.value))} className="bg-black border-white/10 h-12 text-sm"/>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-bold text-[#c9a84c] mb-1 block">Loyer Mensuel Estimé (€) — Pour la renta</label>
                                            <Input type="number" value={monthlyRent} onChange={e=>setMonthlyRent(Number(e.target.value))} className="bg-black border-white/10 h-12 text-sm focus:border-[#c9a84c]"/>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#d35f52] flex items-center gap-2"><ImageIcon size={16}/> Médias</h2>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Photo Principale</label>
                                        <div className="relative h-40 border-2 border-dashed border-white/10 rounded-2xl bg-black flex items-center justify-center overflow-hidden hover:border-[#d35f52]/50 transition-colors">
                                            {mainPhoto ? <img src={mainPhoto} className="w-full h-full object-cover"/> : <div className="text-center text-zinc-600"><UploadCloud size={24} className="mx-auto mb-2"/><span>Cliquer pour ajouter</span></div>}
                                            <input type="file" accept="image/*" onChange={handleMainPhoto} className="absolute inset-0 opacity-0 cursor-pointer"/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 flex justify-between">
                                            <span>Photos complémentaires ({extraPhotos.length})</span>
                                            {uploadingPhotos && <Loader2 size={12} className="animate-spin"/>}
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {extraPhotos.map((url, i) => (
                                                <div key={i} className="aspect-square rounded-xl overflow-hidden relative">
                                                    <img src={url} className="w-full h-full object-cover"/>
                                                    <button onClick={() => setExtraPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:text-rose-400"><X size={12}/></button>
                                                </div>
                                            ))}
                                            <div className="aspect-square border border-dashed border-white/20 rounded-xl flex items-center justify-center relative hover:bg-white/5 cursor-pointer">
                                                <Plus className="text-zinc-500" size={20}/>
                                                <input type="file" accept="image/*" multiple onChange={handleExtraPhotos} className="absolute inset-0 opacity-0 cursor-pointer"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button onClick={handleGenerate} disabled={loading || uploadingPhotos} className="w-full h-14 rounded-2xl font-bold text-lg bg-gradient-to-r from-[#8a0e01] to-[#d35f52] shadow-xl hover:scale-[1.02] transition-transform">
                                    {loading ? <Loader2 className="animate-spin mr-2"/> : <QrCode className="mr-2"/>}
                                    {editId ? "Enregistrer les modifications" : "Générer les Cartes QR Marketing"}
                                </Button>
                            </div>
                        </div>
                    </div>

                ) : (

                    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-12">
                        <div className="text-center">
                            <h2 className="font-display text-3xl sm:text-4xl text-white" style={{ fontWeight: 500 }}>Vos cartes marketing sont prêtes !</h2>
                            <p className="text-zinc-400 mt-2 text-sm">Cliquez sur les boutons pour télécharger les PNG haute définition.</p>
                        </div>

                        {(shortLinks.simulation || shortLinks.galerie) && (
                            <div className="bg-gradient-to-br from-[#111114] to-[#1a1a1f] p-6 md:p-8 rounded-[32px] border border-white/10 shadow-2xl">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8a0e01] to-[#d35f52] flex items-center justify-center flex-shrink-0">
                                        <Link2 size={18} className="text-white"/>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Vos URLs courtes</h3>
                                        <p className="text-[11px] text-zinc-400">À copier-coller dans le texte de vos annonces en ligne (cliquables automatiquement).</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {shortLinks.simulation && (
                                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/50 border border-white/10">
                                            <span className="text-[9px] uppercase tracking-widest font-black px-2 py-1 rounded-lg flex-shrink-0" style={{ background: COLORS.primary + '30', color: '#ff8577' }}>
                                                Simulateur
                                            </span>
                                            <code className="flex-1 text-sm font-mono text-white truncate">
                                                {shortLinks.simulation.shortUrl.replace(/^https?:\/\//, '')}
                                            </code>
                                            <Button
                                                onClick={() => copyToClipboard(shortLinks.simulation!.shortUrl, 'simu-url')}
                                                className="h-9 px-3 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs flex-shrink-0"
                                            >
                                                {copiedKey === 'simu-url' ? <><Check size={14} className="mr-1.5"/>Copié</> : <><Copy size={14} className="mr-1.5"/>Copier</>}
                                            </Button>
                                        </div>
                                    )}
                                    {shortLinks.galerie && (
                                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/50 border border-white/10">
                                            <span className="text-[9px] uppercase tracking-widest font-black px-2 py-1 rounded-lg flex-shrink-0" style={{ background: COLORS.secondary + '30', color: '#ffa89f' }}>
                                                Galerie
                                            </span>
                                            <code className="flex-1 text-sm font-mono text-white truncate">
                                                {shortLinks.galerie.shortUrl.replace(/^https?:\/\//, '')}
                                            </code>
                                            <Button
                                                onClick={() => copyToClipboard(shortLinks.galerie!.shortUrl, 'gal-url')}
                                                className="h-9 px-3 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs flex-shrink-0"
                                            >
                                                {copiedKey === 'gal-url' ? <><Check size={14} className="mr-1.5"/>Copié</> : <><Copy size={14} className="mr-1.5"/>Copier</>}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {shortLinks.simulation && (
                                <FormatBloc
                                    kind="simulation"
                                    color={COLORS.primary}
                                    title="Simulateur de prêt"
                                    shortUrl={shortLinks.simulation.shortUrl}
                                    address={address}
                                    priceFAI={priceFAI}
                                    onDownloadPrint={() => downloadPrintFormat("simulation")}
                                    onDownloadWeb={() => downloadWebFormat("simulation")}
                                    onDownloadTeaser={() => downloadTeaserFormat("simulation")}
                                    hasMainPhoto={!!mainPhoto}
                                />
                            )}
                            {shortLinks.galerie && (
                                <FormatBloc
                                    kind="galerie"
                                    color={COLORS.secondary}
                                    title="Galerie photos"
                                    shortUrl={shortLinks.galerie.shortUrl}
                                    address={address}
                                    priceFAI={priceFAI}
                                    onDownloadPrint={() => downloadPrintFormat("galerie")}
                                    onDownloadWeb={() => downloadWebFormat("galerie")}
                                    onDownloadTeaser={() => downloadTeaserFormat("galerie")}
                                    hasMainPhoto={!!mainPhoto}
                                />
                            )}
                        </div>

                        <details className="bg-[#0a0a0c] border border-white/5 rounded-3xl overflow-hidden">
                            <summary className="cursor-pointer px-6 py-4 text-sm font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-3">
                                <Layers size={16}/>
                                Anciens formats (cartes combinées, URL longue)
                            </summary>
                            <div className="px-6 pb-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div className="flex flex-col gap-3">
                                        <div className="bg-white rounded-xl overflow-hidden shadow-2xl flex border border-zinc-200 relative h-[180px]">
                                            <div className="absolute top-0 left-0 right-0 h-2 bg-[#8a0e01]"></div>
                                            <div className="w-[42%] flex items-center justify-center p-4 pt-6">
                                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${domain}/simulation/${generatedId}`)}&margin=0`} className="w-full h-auto object-contain" alt="QR Simu"/>
                                            </div>
                                            <div className="w-[58%] flex flex-col justify-center pr-5 pt-2 relative">
                                                <h3 className="text-2xl font-black text-zinc-900 leading-tight mb-2">SIMULATEUR<br/>DE PRÊT</h3>
                                                <p className="text-[10px] font-bold text-[#8a0e01] uppercase tracking-wide leading-snug">SIMULEZ VOTRE CRÉDIT ET<br/>CALCULEZ VOTRE RENTABILITÉ</p>
                                                {address && <span className="absolute bottom-2 right-4 text-[9px] italic text-zinc-400 font-medium">{address}</span>}
                                            </div>
                                        </div>
                                        <Button onClick={() => downloadSingleQR(`${domain}/simulation/${generatedId}`, "SIMULATION")} className="w-full h-10 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 font-bold text-xs">
                                            <Download size={14} className="mr-2"/> Carte Simu (URL longue)
                                        </Button>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="bg-white rounded-xl overflow-hidden shadow-2xl flex border border-zinc-200 relative h-[180px]">
                                            <div className="absolute top-0 left-0 right-0 h-2 bg-[#d35f52]"></div>
                                            <div className="w-[42%] flex items-center justify-center p-4 pt-6">
                                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${domain}/galerie/${generatedId}`)}&margin=0`} className="w-full h-auto object-contain" alt="QR Galerie"/>
                                            </div>
                                            <div className="w-[58%] flex flex-col justify-center pr-5 pt-2 relative">
                                                <h3 className="text-2xl font-black text-zinc-900 leading-tight mb-2">GALERIE<br/>PHOTOS</h3>
                                                <p className="text-[10px] font-bold text-[#d35f52] uppercase tracking-wide leading-snug">FLASHEZ POUR VISITER LE<br/>BIEN AVEC NOS PHOTOS</p>
                                                {address && <span className="absolute bottom-2 right-4 text-[9px] italic text-zinc-400 font-medium">{address}</span>}
                                            </div>
                                        </div>
                                        <Button onClick={() => downloadSingleQR(`${domain}/galerie/${generatedId}`, "GALERIE")} className="w-full h-10 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 font-bold text-xs">
                                            <Download size={14} className="mr-2"/> Carte Galerie (URL longue)
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-[#111114] p-6 rounded-[24px] border border-white/5 text-center">
                                    <p className="text-xs text-zinc-400 mb-4">Version originale (2-en-1, URL longue)</p>
                                    <Button onClick={downloadCombinedQR} size="lg" className="rounded-full px-8 h-12 font-bold text-sm bg-gradient-to-r from-[#8a0e01] to-[#d35f52] shadow-xl hover:scale-105 transition-transform">
                                        <Layers className="mr-2" size={18}/> Télécharger l'Image Combinée (2-en-1)
                                    </Button>
                                </div>
                            </div>
                        </details>

                        <div className="mt-12 text-center pb-10 flex gap-4 justify-center">
                            <Link href="/mes-biens">
                                <Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10"><ArrowLeft className="mr-2" size={16}/> Retour au Dashboard</Button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function FormatBloc({ kind, color, title, shortUrl, address, priceFAI, onDownloadPrint, onDownloadWeb, onDownloadTeaser, hasMainPhoto }: any) {
    return (
        <div className="bg-[#111114] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }}/>
            <div className="p-6 flex items-center gap-4 border-b border-white/5">
                <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortUrl)}&margin=0`} alt={`QR ${kind}`} className="w-full h-full object-contain p-1" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-black mb-1" style={{ color }}>{kind === "simulation" ? "Pour le simulateur" : "Pour la galerie"}</p>
                    <h3 className="text-base font-bold text-white leading-tight">{title}</h3>
                    <code className="text-[11px] text-zinc-500 font-mono truncate block mt-1">{shortUrl.replace(/^https?:\/\//, '')}</code>
                </div>
            </div>
            <div className="p-6 space-y-3">
                <FormatButton icon={<Printer size={16}/>} label="Format Print" sublabel="Vitrine, flyers (1200×1200)" onClick={onDownloadPrint} color={color} />
                <FormatButton icon={<Globe2 size={16}/>} label="Format Web" sublabel="Portails en ligne (1200×630, URL visible)" onClick={onDownloadWeb} color={color} />
                <FormatButton icon={<Sparkles size={16}/>} label="Format Story" sublabel={hasMainPhoto ? "Instagram, réseaux (1080×1920)" : "⚠ Photo principale requise"} onClick={onDownloadTeaser} color={color} disabled={!hasMainPhoto} />
            </div>
        </div>
    );
}

function FormatButton({ icon, label, sublabel, onClick, color, disabled = false }: any) {
    return (
        <button onClick={onClick} disabled={disabled} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/10 hover:bg-black/60 hover:border-white/20 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black/40 disabled:hover:border-white/10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 group-disabled:group-hover:scale-100" style={{ background: `${color}30`, color: '#fff' }}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white leading-tight">{label}</p>
                <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">{sublabel}</p>
            </div>
            <Download size={14} className="text-zinc-500 group-hover:text-white transition-colors flex-shrink-0"/>
        </button>
    );
}