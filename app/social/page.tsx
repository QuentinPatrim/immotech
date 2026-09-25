"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchSharedEstimation } from "@/lib/sharedEstimation";
import {
    Instagram, Linkedin, MessageCircle, Image as ImageIcon,
    Download, Copy, Check, Sparkles, Loader2, ArrowLeft,
    Globe, Wand2, Home, Banknote, LayoutTemplate, SplitSquareHorizontal, Grid2X2, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const COLORS = {
    primary: "#8a0e01",
    secondary: "#d35f52",
};

export default function SocialHub() {
    const searchParams = useSearchParams();
    const editId = searchParams.get("id");

    const [loading, setLoading] = useState(false);
    const [domain, setDomain] = useState("");

    // --- IMPORT WEB ---
    const [listingUrl, setListingUrl] = useState("");
    const [isScraping, setIsScraping] = useState(false);

    // --- DONNÉES DU BIEN ---
    const [address, setAddress] = useState("");
    const [propertyType, setPropertyType] = useState("Appartement");
    const [rooms, setRooms] = useState<number | "">("");
    const [surface, setSurface] = useState<number | "">("");
    const [priceFAI, setPriceFAI] = useState<number | "">("");
    const [dpe, setDpe] = useState("C");
    const [badgeText, setBadgeText] = useState("NOUVEAU MANDAT");
    
    // --- PHOTOS ---
    const [mainPhoto, setMainPhoto] = useState<string>("");
    const [extraPhotos, setExtraPhotos] = useState<string[]>([]);
    
    // --- ÉTAT GÉNÉRATION ET DESIGN ---
    const [isGenerated, setIsGenerated] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [layoutStyle, setLayoutStyle] = useState<"SINGLE" | "DUO" | "COLLAGE">("COLLAGE");
    const [isDownloading, setIsDownloading] = useState(false);
    
    // --- SHORT LINKS (Pour intégration dans le texte et sur les photos) ---
    const [shortLinks, setShortLinks] = useState<{ galerie?: { shortUrl: string } }>({});

    useEffect(() => {
        if (typeof window !== "undefined") setDomain(window.location.origin);
        if (editId) loadExistingData(editId);
    }, [editId]);

    const loadExistingData = async (id: string) => {
        setLoading(true);
        const data = { data_json: await fetchSharedEstimation(id) };
        if (data && data.data_json) {
            const d = data.data_json;
            setAddress(d.propertyAddress || "");
            setPropertyType(d.propertyType || "Appartement");
            setRooms(d.rooms || "");
            setSurface(d.surface || "");
            setPriceFAI(d.commercialSettings?.sellingPriceFAI || d.highPrice || "");
            setDpe(d.dpe || "C");
            setMainPhoto(d.mainPhoto || "");
            setExtraPhotos(d.extraPhotos || []);
        }
        setLoading(false);
    };

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
                    if (data.photos.length > 1) setExtraPhotos(data.photos.slice(1, 9));
                }
                alert("Importation réussie ! Complétez la surface et les pièces.");
            } else alert("Erreur: " + data.error);
        } catch (error) {
            alert("Erreur de connexion.");
        }
        setIsScraping(false);
    };

    // --- GÉNÉRATION (Génère aussi le lien court automatiquement) ---
    const handleGenerate = async () => {
        if (!mainPhoto || !priceFAI || !surface) return alert("La photo, le prix et la surface sont obligatoires.");
        
        setIsGenerated(true);
        
        // Création du lien court (Même mécanique que le générateur QR Express)
        if (editId && domain) {
            try {
                const res = await fetch('/api/shortlinks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ targetUrl: `${domain}/galerie/${editId}`, estimationId: editId, kind: "galerie" }),
                });
                const json = await res.json();
                if (json.slug) {
                    setShortLinks({ galerie: { shortUrl: `${domain}/s/${json.slug}` } });
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    const copyToClipboard = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key); setTimeout(() => setCopiedKey(null), 2000);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text; document.body.appendChild(ta);
            ta.select(); try { document.execCommand('copy'); } catch {}
            document.body.removeChild(ta);
            setCopiedKey(key); setTimeout(() => setCopiedKey(null), 2000);
        }
    };

    // --- COPYWRITING AVEC LIEN INTÉGRÉ ---
    const generateCaptions = () => {
        const shortAddr = address ? address.split(',')[0] : "ce secteur très prisé";
        
        // S'il y a un lien court, on l'utilise, sinon un texte par défaut
        const linkText = shortLinks.galerie 
            ? `🔗 Visitez le bien et voir plus de photos : ${shortLinks.galerie.shortUrl}` 
            : `🔗 Lien pour visiter en bio`;

        const instagram = `✨ ${badgeText} chez PATRIM ✨\n\nDécouvrez ce superbe ${propertyType.toLowerCase()} de ${surface}m² situé à ${shortAddr}.\n\nCe bien aux prestations soignées vous offre de beaux volumes et une belle luminosité.\n\n📐 Surface : ${surface} m²\n🚪 Pièces : ${rooms} pièces\n🌿 DPE : Classe ${dpe}\n\n💰 Prix : ${Number(priceFAI).toLocaleString('fr-FR')} € FAI\n\n${linkText}\n\nEnvie d'organiser une visite ? Contactez-nous en DM ! 📲\n\n#Immobilier #Patrim #AgenceImmobiliere #AchatImmo #${propertyType} #Investissement #Visite`;

        const tiktok = `Alerte pépite 🚨 ${badgeText.toLowerCase()} chez Patrim !\n\n📍 ${shortAddr}\n🏠 ${propertyType} de ${surface}m²\n💶 ${Number(priceFAI).toLocaleString('fr-FR')} €\n\nTu valides ce bien ? Dis-le nous en commentaire ! 👇\n\n${linkText}\n#ImmoTiktok #Visite #Investissement #${propertyType}`;

        const linkedin = `🚀 ${badgeText} chez Patrim\n\nNous sommes ravis de vous présenter notre exclusivité à la vente :\nUn superbe ${propertyType.toLowerCase()} de ${surface} m² situé à ${shortAddr}.\n\nCaractéristiques clés :\n🔹 ${rooms} pièces offrant de beaux volumes\n🔹 Performance énergétique : DPE ${dpe}\n🔹 Prix de présentation : ${Number(priceFAI).toLocaleString('fr-FR')} € FAI\n\n${linkText}\n\nNotre équipe est à votre entière disposition pour échanger sur ce bien ou vous accompagner dans vos projets immobiliers.\n\nN'hésitez pas à nous contacter.\n#Immobilier #RealEstate #Patrim #Opportunité #Investissement`;

        return { instagram, tiktok, linkedin };
    };

    const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
        const imgRatio = img.width / img.height;
        const canvasRatio = w / h;
        let drawW = w, drawH = h, dx = 0, dy = 0;
        if (imgRatio > canvasRatio) {
            drawH = h; drawW = drawH * imgRatio; dx = (w - drawW) / 2;
        } else {
            drawW = w; drawH = drawW / imgRatio; dy = (h - drawH) / 2;
        }
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.drawImage(img, x + dx, y + dy, drawW, drawH);
        ctx.restore();
    };

    const loadImage = async (src: string): Promise<HTMLImageElement | null> => {
        if (!src) return null;
        try {
            const fetchUrl = src.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(src)}` : src;
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error("Proxy error");
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = objectUrl;
            });
        } catch (error) {
            return null;
        }
    };

    // --- GÉNÉRATION PHOTO DE COUVERTURE ---
    const downloadSocialImage = async (format: "SQUARE" | "PORTRAIT", pageIndex: number = 1, isCarousel: boolean = false, totalPages: number = 1) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = format === "SQUARE" ? 1080 : 1350;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#111114"; ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img1 = await loadImage(mainPhoto);
        const img2 = (layoutStyle === "DUO" || layoutStyle === "COLLAGE") && extraPhotos[0] ? await loadImage(extraPhotos[0]) : null;
        const img3 = layoutStyle === "COLLAGE" && extraPhotos[1] ? await loadImage(extraPhotos[1]) : null;

        const validImages = [img1, img2, img3].filter(Boolean) as HTMLImageElement[];
        const gap = 10; 
        
        if (layoutStyle === "COLLAGE" && validImages.length >= 3) {
            const hTop = (canvas.height - gap) * 0.6; 
            const hBot = (canvas.height - gap) * 0.4;
            const wHalf = (canvas.width - gap) / 2;
            drawImageCover(ctx, validImages[0], 0, 0, canvas.width, hTop);
            drawImageCover(ctx, validImages[1], 0, hTop + gap, wHalf, hBot);
            drawImageCover(ctx, validImages[2], wHalf + gap, hTop + gap, wHalf, hBot);
        } else if ((layoutStyle === "DUO" || layoutStyle === "COLLAGE") && validImages.length >= 2) {
            const h = (canvas.height - gap) / 2;
            drawImageCover(ctx, validImages[0], 0, 0, canvas.width, h);
            drawImageCover(ctx, validImages[1], 0, h + gap, canvas.width, h);
        } else if (validImages.length >= 1) {
            drawImageCover(ctx, validImages[0], 0, 0, canvas.width, canvas.height);
        }

        const grad = ctx.createLinearGradient(0, canvas.height * 0.4, 0, canvas.height);
        grad.addColorStop(0, "rgba(10,10,12,0)");
        grad.addColorStop(0.6, "rgba(10,10,12,0.85)");
        grad.addColorStop(1, "rgba(10,10,12,0.98)");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 3; ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

        try {
            const logo = await loadImage('/logo-patrim.png');
            if (logo) {
                const ratio = logo.height / logo.width;
                const logoW = 280; const logoH = 280 * ratio;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20;
                ctx.beginPath(); ctx.roundRect(60, 60, logoW + 40, logoH + 20, 10); ctx.fill();
                ctx.shadowBlur = 0; ctx.drawImage(logo, 80, 70, logoW, logoH);
            }
        } catch {}

        const badgeY = canvas.height - 350;
        ctx.font = "bold 22px Arial, sans-serif";
        const badgeW = ctx.measureText(badgeText).width;
        ctx.fillStyle = COLORS.secondary;
        ctx.fillRect(80, badgeY, badgeW + 40, 50);
        ctx.fillStyle = "#ffffff"; ctx.textAlign = "center";
        ctx.fillText(badgeText, 80 + (badgeW + 40)/2, badgeY + 34);

        ctx.textAlign = "left"; ctx.fillStyle = "#ffffff";
        ctx.font = "900 80px Arial, sans-serif";
        ctx.fillText(`${Number(priceFAI).toLocaleString('fr-FR')} €`, 80, canvas.height - 210);

        ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "bold 38px Arial, sans-serif";
        ctx.fillText(`${propertyType.toUpperCase()} — ${surface} m² — ${rooms} PIÈCES`, 80, canvas.height - 140);

        if (address) {
            ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "italic 30px Arial, sans-serif";
            const shortAddr = address.length > 50 ? address.substring(0, 50) + "…" : address;
            ctx.fillText(shortAddr, 80, canvas.height - 80);
        }

        // Ajout du lien en bas de la photo
        if (shortLinks.galerie) {
            ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "bold 16px monospace"; ctx.textAlign = "center";
            ctx.fillText(shortLinks.galerie.shortUrl.replace(/^https?:\/\//, ''), canvas.width / 2, canvas.height - 20);
        }

        if (isCarousel) {
            ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(canvas.width - 160, 60, 100, 44, 22); ctx.fill();
            ctx.fillStyle = "#ffffff"; ctx.font = "bold 20px Arial, sans-serif"; ctx.textAlign = "center";
            ctx.fillText(`${pageIndex} / ${totalPages}`, canvas.width - 110, 89);
        } else {
            ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.beginPath(); ctx.roundRect(canvas.width - 200, canvas.height - 130, 120, 50, 8); ctx.fill();
            ctx.fillStyle = "#ffffff"; ctx.font = "bold 20px Arial, sans-serif"; ctx.textAlign = "center";
            ctx.fillText(`DPE : ${dpe}`, canvas.width - 140, canvas.height - 96);
        }

        const link = document.createElement("a");
        link.download = `Patrim_Post_${format}_Page${pageIndex}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    // --- GÉNÉRATION D'UN SLIDE INTÉRIEUR ---
    const downloadSlide = async (photoUrl: string, format: "SQUARE" | "PORTRAIT", pageNum: number, totalPages: number) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = format === "SQUARE" ? 1080 : 1350;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = await loadImage(photoUrl);
        if (img) {
            drawImageCover(ctx, img, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "#111114"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const grad = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
        grad.addColorStop(0, "rgba(10,10,12,0)"); grad.addColorStop(1, "rgba(10,10,12,0.9)");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 3;
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

        try {
            const logo = await loadImage('/logo-patrim.png');
            if (logo) {
                const ratio = logo.height / logo.width;
                const logoW = 180; const logoH = 180 * ratio;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.roundRect(60, 60, logoW + 30, logoH + 16, 10); ctx.fill();
                ctx.shadowBlur = 0; ctx.drawImage(logo, 75, 68, logoW, logoH);
            }
        } catch {}

        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(canvas.width - 160, 60, 100, 44, 22); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 20px Arial, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(`${pageNum} / ${totalPages}`, canvas.width - 110, 89);

        // Ajout du lien court en bas
        if (shortLinks.galerie) {
            ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "bold 18px monospace";
            ctx.fillText(shortLinks.galerie.shortUrl.replace(/^https?:\/\//, ''), canvas.width - 60, canvas.height - 60);
        }

        if (address) {
            ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "italic 26px Arial, sans-serif";
            const shortAddr = address.length > 50 ? address.substring(0, 50) + "…" : address;
            ctx.fillText(shortAddr, 70, canvas.height - 60);
        }

        const link = document.createElement("a");
        link.download = `Patrim_Post_${format}_Page${pageNum}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    // --- GÉNÉRATION DU SLIDE DE FIN (APPEL À L'ACTION + QR CODE) ---
    const downloadFinalSlide = async (format: "SQUARE" | "PORTRAIT", pageNum: number, totalPages: number) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = format === "SQUARE" ? 1080 : 1350;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Fond sombre stylé
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, "#111114");
        grad.addColorStop(1, COLORS.primary);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Cadre
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

        // Textes d'Accroche
        ctx.fillStyle = "#ffffff"; ctx.textAlign = "center";
        ctx.font = "900 65px Arial, sans-serif";
        ctx.fillText("DÉCOUVREZ CE BIEN", canvas.width / 2, 250);
        
        ctx.font = "bold 30px Arial, sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText("Galerie photo & Simulateur de prêt", canvas.width / 2, 310);

        // QR Code
        if (shortLinks.galerie) {
            try {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(shortLinks.galerie.shortUrl)}&margin=0`;
                const qrImg = await loadImage(qrUrl);
                if (qrImg) {
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath(); ctx.roundRect(canvas.width / 2 - 220, 380, 440, 440, 20); ctx.fill();
                    ctx.drawImage(qrImg, canvas.width / 2 - 200, 400, 400, 400);
                }

                ctx.fillStyle = "#ffffff"; ctx.font = "900 32px Arial, sans-serif";
                ctx.fillText("SCANNEZ CE QR CODE", canvas.width / 2, 880);

                ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "italic 22px Arial, sans-serif";
                ctx.fillText("ou tapez directement le lien ci-dessous :", canvas.width / 2, 980);

                ctx.fillStyle = "#ffffff"; ctx.font = "bold 36px monospace";
                ctx.fillText(shortLinks.galerie.shortUrl.replace(/^https?:\/\//, ''), canvas.width / 2, 1040);
            } catch (e) {}
        }

        // Compteur
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(canvas.width - 160, 60, 100, 44, 22); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 20px Arial, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(`${pageNum} / ${totalPages}`, canvas.width - 110, 89);

        const link = document.createElement("a");
        link.download = `Patrim_Post_${format}_Page${pageNum}_CTA.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    // --- ORCHESTRATEUR DE TÉLÉCHARGEMENT MULTIPLE ---
    const downloadCarousel = async (format: "SQUARE" | "PORTRAIT") => {
        // ALERTE POUR DÉBLOQUER LES POPUPS
        alert("⚠️ Le téléchargement multiple va démarrer.\n\nIMPORTANT : Si votre navigateur bloque l'opération, cherchez la petite icône de fenêtre barrée en haut à droite (dans la barre d'adresse) et choisissez 'Toujours autoriser les pop-ups'.");
        
        setIsDownloading(true);

        let usedPhotosCount = 0;
        if (layoutStyle === "SINGLE") usedPhotosCount = 0;
        if (layoutStyle === "DUO") usedPhotosCount = 1;
        if (layoutStyle === "COLLAGE") usedPhotosCount = 2;

        const remainingPhotos = extraPhotos.slice(usedPhotosCount, usedPhotosCount + 6); // Max 6 intérieurs
        // Total = 1 Couverture + X Intérieurs + 1 Fin (CTA)
        const totalSlides = 1 + remainingPhotos.length + 1; 

        // 1. Couverture
        await downloadSocialImage(format, 1, true, totalSlides);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Pause augmentée pour éviter le blocage

        // 2. Intérieurs
        for (let i = 0; i < remainingPhotos.length; i++) {
            await downloadSlide(remainingPhotos[i], format, i + 2, totalSlides);
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // 3. Appel à l'action final
        await downloadFinalSlide(format, totalSlides, totalSlides);

        setIsDownloading(false);
    };

    if (loading) return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"><Loader2 className="animate-spin text-[#d35f52] w-10 h-10"/></div>;

    const captions = isGenerated ? generateCaptions() : null;

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white font-sans pb-32">
            <div className="border-b border-white/10 bg-[#111114] sticky top-0 z-50 relative">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/mes-biens" className="text-zinc-400 hover:text-white bg-white/5 p-2 rounded-full transition-colors"><ArrowLeft size={20}/></Link>
                        <div>
                            <h1 className="text-xl font-bold font-serif flex items-center gap-2"><Instagram size={20} className="text-[#d35f52]"/> Social Media Hub</h1>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Générateur de Posts & Copywriting</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 mt-10">
                {!isGenerated ? (
                    <div className="animate-in fade-in duration-300 space-y-10">
                        {/* IMPORT URL */}
                        <div className="bg-gradient-to-r from-[#111114] to-[#1a1a1f] p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-center gap-6">
                            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/5 shrink-0 border border-white/10">
                                <Globe className="text-[#d35f52]" size={24}/>
                            </div>
                            <div className="flex-1 w-full">
                                <h2 className="text-sm font-bold text-white mb-1">Aspirateur d'Annonce</h2>
                                <p className="text-xs text-zinc-400 mb-3">Collez le lien de votre site pour pré-remplir les informations du post et importer TOUTES les photos.</p>
                                <div className="flex gap-3 w-full">
                                    <Input value={listingUrl} onChange={e => setListingUrl(e.target.value)} placeholder="https://www.patrim.fr/..." className="flex-1 bg-black/50 border-white/20 h-12 text-sm text-white focus:border-[#d35f52]"/>
                                    <Button onClick={handleImportFromUrl} disabled={isScraping} className="h-12 px-6 rounded-xl font-bold bg-white text-black hover:bg-zinc-200 transition-colors">
                                        {isScraping ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} className="mr-2" />} Importer
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* DATA FORM */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-8">
                                <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#d35f52] flex items-center gap-2"><Home size={16}/> Infos Clés du Post</h2>
                                    <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Adresse ou Secteur</label><Input value={address} onChange={e=>setAddress(e.target.value)} className="bg-black border-white/10 h-12 text-sm focus:border-[#d35f52]"/></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Type</label>
                                            <select value={propertyType} onChange={e=>setPropertyType(e.target.value)} className="w-full bg-black border border-white/10 h-12 rounded-xl px-3 text-sm focus:border-[#d35f52] text-white outline-none">
                                                <option>Appartement</option><option>Maison</option><option>Loft</option><option>Villa</option><option>Terrain</option>
                                            </select>
                                        </div>
                                        <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">DPE</label><select value={dpe} onChange={e=>setDpe(e.target.value)} className="w-full bg-black border border-white/10 h-12 rounded-xl px-3 text-sm focus:border-[#d35f52] text-white outline-none"><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option><option>F</option><option>G</option></select></div>
                                        <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Pièces</label><Input type="number" value={rooms} onChange={e=>setRooms(Number(e.target.value))} className="bg-black border-white/10 h-12 text-sm"/></div>
                                        <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Surface (m²)</label><Input type="number" value={surface} onChange={e=>setSurface(Number(e.target.value))} className="bg-black border-white/10 h-12 text-sm"/></div>
                                        
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-bold text-[#d35f52] mb-1 block">Étiquette Marketing (Badge)</label>
                                            <select value={badgeText} onChange={e=>setBadgeText(e.target.value)} className="w-full bg-black/50 border border-white/10 h-12 rounded-xl px-3 text-sm focus:border-[#d35f52] text-white outline-none">
                                                <option value="NOUVEAU MANDAT">Nouveau Mandat</option>
                                                <option value="EXCLUSIVITÉ">Exclusivité</option>
                                                <option value="À VENDRE">À Vendre</option>
                                                <option value="COUP DE CŒUR">Coup de Cœur</option>
                                                <option value="IDÉAL INVESTISSEUR">Idéal Investisseur</option>
                                                <option value="SOUS COMPROMIS">Sous Compromis</option>
                                                <option value="VENDU">Vendu</option>
                                                <option value="BAISSE DE PRIX">Baisse de Prix</option>
                                            </select>
                                        </div>

                                    </div>
                                    <div><label className="text-[10px] uppercase font-bold text-[#c9a84c] mb-1 block">Prix Affiché (€) *</label><Input type="number" value={priceFAI} onChange={e=>setPriceFAI(Number(e.target.value))} className="bg-black border-[#c9a84c]/50 h-14 text-xl font-black text-white focus:border-[#c9a84c]"/></div>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#d35f52] flex items-center gap-2"><ImageIcon size={16}/> Base Photographique</h2>
                                        <span className="text-[10px] text-zinc-500 font-bold">{extraPhotos.length + (mainPhoto?1:0)} photo(s) chargée(s)</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-3 h-32 border-2 border-white/10 rounded-xl bg-black overflow-hidden relative group">
                                            {mainPhoto ? <img src={mainPhoto} className="w-full h-full object-cover"/> : <div className="h-full flex items-center justify-center text-zinc-600 text-xs">Photo principale</div>}
                                            <div className="absolute top-2 left-2 bg-black/70 text-[9px] font-bold px-2 py-0.5 rounded text-white">PRINCIPALE</div>
                                        </div>
                                        {extraPhotos.slice(0,3).map((p, i) => (
                                            <div key={i} className="h-20 border-2 border-white/10 rounded-xl bg-black overflow-hidden">
                                                <img src={p} className="w-full h-full object-cover"/>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-zinc-500 text-center italic mt-2">Générez le pack pour choisir votre mise en page.</p>
                                </div>

                                <Button onClick={handleGenerate} className="w-full h-14 rounded-2xl font-bold text-lg bg-gradient-to-r from-[#8a0e01] to-[#d35f52] shadow-xl hover:scale-[1.02] transition-transform">
                                    <Sparkles className="mr-2"/> Générer le Pack Social
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-10">
                        <div className="text-center mb-6">
                            <h2 className="text-3xl font-serif font-bold">Votre Pack Social est prêt !</h2>
                            <p className="text-zinc-400 mt-2">Choisissez votre mise en page et exportez vos carrousels avec QR Code intégré.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            
                            {/* COLONNE GAUCHE : VISUELS (5 colonnes) */}
                            <div className="lg:col-span-5 space-y-6">
                                <div className="bg-[#111114] p-6 rounded-[32px] border border-white/5 shadow-2xl">
                                    <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center justify-center gap-2 text-zinc-300 text-center"><ImageIcon size={16}/> Créateur de Visuel</h3>
                                    
                                    {/* SÉLECTEUR DE LAYOUT */}
                                    <div className="flex bg-black/50 p-1.5 rounded-xl border border-white/10 mb-6">
                                        <button onClick={() => setLayoutStyle("SINGLE")} className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-[10px] font-bold uppercase transition-colors ${layoutStyle === "SINGLE" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                                            <LayoutTemplate size={18} className="mb-1"/> Image Unique
                                        </button>
                                        <button onClick={() => setLayoutStyle("DUO")} disabled={extraPhotos.length < 1} className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-[10px] font-bold uppercase transition-colors ${layoutStyle === "DUO" ? "bg-white/10 text-white" : extraPhotos.length < 1 ? "opacity-30 cursor-not-allowed text-zinc-600" : "text-zinc-500 hover:text-zinc-300"}`}>
                                            <SplitSquareHorizontal size={18} className="mb-1"/> Duo (2 photos)
                                        </button>
                                        <button onClick={() => setLayoutStyle("COLLAGE")} disabled={extraPhotos.length < 2} className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-[10px] font-bold uppercase transition-colors ${layoutStyle === "COLLAGE" ? "bg-white/10 text-white" : extraPhotos.length < 2 ? "opacity-30 cursor-not-allowed text-zinc-600" : "text-zinc-500 hover:text-zinc-300"}`}>
                                            <Grid2X2 size={18} className="mb-1"/> Mosaïque (3)
                                        </button>
                                    </div>

                                    {/* PREVIEW INTERACTIVE HTML/CSS */}
                                    <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-xl mb-6 border border-white/10 bg-black">
                                        
                                        {/* Rendu Single */}
                                        {layoutStyle === "SINGLE" && (
                                            <img src={mainPhoto} className="absolute inset-0 w-full h-full object-cover"/>
                                        )}

                                        {/* Rendu Duo */}
                                        {layoutStyle === "DUO" && (
                                            <div className="absolute inset-0 flex flex-col gap-1">
                                                <img src={mainPhoto} className="w-full h-1/2 object-cover"/>
                                                {extraPhotos[0] && <img src={extraPhotos[0]} className="w-full h-1/2 object-cover"/>}
                                            </div>
                                        )}

                                        {/* Rendu Collage */}
                                        {layoutStyle === "COLLAGE" && (
                                            <div className="absolute inset-0 flex flex-col gap-1">
                                                <img src={mainPhoto} className="w-full h-[60%] object-cover"/>
                                                <div className="flex gap-1 h-[40%] w-full">
                                                    {extraPhotos[0] && <img src={extraPhotos[0]} className="w-1/2 h-full object-cover"/>}
                                                    {extraPhotos[1] && <img src={extraPhotos[1]} className="w-1/2 h-full object-cover"/>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Calques de Branding par-dessus la grille */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>
                                        <div className="absolute inset-2 border-2 border-white/20 rounded-xl pointer-events-none"></div>
                                        
                                        <div className="absolute inset-0 flex flex-col justify-end p-6 text-left pointer-events-none">
                                            <span className="text-[10px] font-bold bg-[#d35f52] text-white px-2 py-1 rounded inline-block w-max mb-2">{badgeText}</span>
                                            <p className="text-4xl font-black text-white">{Number(priceFAI).toLocaleString('fr-FR')} €</p>
                                            <p className="text-xs font-bold text-zinc-300 mt-1">{propertyType.toUpperCase()} — {surface} M²</p>
                                        </div>
                                    </div>
                                    
                                    {/* BOUTONS D'EXPORT */}
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <Button onClick={() => downloadSocialImage("SQUARE")} disabled={isDownloading} className="flex-1 rounded-xl bg-white/10 text-white hover:bg-white/20 font-bold h-11 text-[11px] border border-white/10">
                                                <Download size={14} className="mr-2"/> Couverture (Carré)
                                            </Button>
                                            <Button onClick={() => downloadSocialImage("PORTRAIT")} disabled={isDownloading} className="flex-1 rounded-xl bg-white/10 text-white hover:bg-white/20 font-bold h-11 text-[11px] border border-white/10">
                                                <Download size={14} className="mr-2"/> Couverture (Portrait)
                                            </Button>
                                        </div>
                                        
                                        <div className="pt-2 border-t border-white/10">
                                            <Button onClick={() => downloadCarousel("PORTRAIT")} disabled={isDownloading || extraPhotos.length < 2} className="w-full h-12 rounded-xl bg-gradient-to-r from-[#8a0e01] to-[#d35f52] font-bold shadow-lg hover:scale-[1.02] transition-transform">
                                                {isDownloading ? <Loader2 className="animate-spin mr-2" size={16}/> : <Layers className="mr-2" size={16}/>}
                                                {isDownloading ? "Génération en cours..." : "Générer un Carrousel Complet"}
                                            </Button>
                                            <p className="text-[9px] text-zinc-500 text-center mt-2 font-medium">Génère la couverture + les slides photos + 1 slide finale avec QR Code et lien court.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COLONNE DROITE : TEXTES (7 colonnes) */}
                            <div className="lg:col-span-7 space-y-6">
                                <CopywritingCard platform="Instagram / Facebook" icon={<Instagram size={18} className="text-[#E1306C]"/>} text={captions!.instagram} copiedKey={copiedKey} onCopy={copyToClipboard} id="ig" />
                                <CopywritingCard platform="TikTok / Reels" icon={<MessageCircle size={18} className="text-[#00f2fe]"/>} text={captions!.tiktok} copiedKey={copiedKey} onCopy={copyToClipboard} id="tk" />
                                <CopywritingCard platform="LinkedIn" icon={<Linkedin size={18} className="text-[#0077b5]"/>} text={captions!.linkedin} copiedKey={copiedKey} onCopy={copyToClipboard} id="li" />
                            </div>

                        </div>

                        <div className="text-center pt-8">
                            <Button variant="outline" onClick={() => setIsGenerated(false)} className="rounded-full border-white/20 text-white hover:bg-white/10">
                                <ArrowLeft className="mr-2" size={16}/> Revenir aux réglages
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function CopywritingCard({ platform, icon, text, copiedKey, onCopy, id }: any) {
    return (
        <div className="bg-[#111114] p-6 rounded-3xl border border-white/5 shadow-xl relative group">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-bold text-white"><div className="bg-white/5 p-2 rounded-xl">{icon}</div>{platform}</div>
                <Button onClick={() => onCopy(text, id)} className="h-8 px-3 rounded-lg bg-white/10 text-white hover:bg-white/20 font-bold text-xs transition-colors">
                    {copiedKey === id ? <><Check size={12} className="mr-1.5 text-emerald-400"/> Copié</> : <><Copy size={12} className="mr-1.5"/> Copier</>}
                </Button>
            </div>
            <div className="bg-black/50 p-4 rounded-2xl border border-white/5 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-medium">
                {text}
            </div>
        </div>
    );
}