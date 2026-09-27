"use client";

/* ============================================================
   PLAN 3D — CATALOGUE DE MEUBLES
   Rayons, recherche, vignettes : un toucher ajoute le meuble dans
   la pièce sélectionnée (ou remplace le meuble sélectionné).
   ============================================================ */

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { SHELVES, loadCatalog, type LibraryItem } from "@/lib/plan3d/library";

export default function CatalogPanel({ replacing, onPick, onClose }: {
    /** Remplacement d'un meuble (sinon ajout) */
    replacing: string | null;
    onPick: (item: LibraryItem) => void;
    onClose: () => void;
}) {
    const [items, setItems] = useState<LibraryItem[] | null>(null);
    const [error, setError] = useState("");
    const [shelf, setShelf] = useState("seating");
    const [q, setQ] = useState("");
    useEffect(() => {
        let live = true;
        loadCatalog().then(i => { if (live) setItems(i); }, e => { if (live) setError(e instanceof Error ? e.message : "Bibliothèque indisponible."); });
        return () => { live = false; };
    }, []);
    const shown = useMemo(() => {
        if (!items) return [];
        const s = q.trim().toLowerCase();
        const test = SHELVES.find(x => x.id === shelf)?.test;
        return items.filter(i => {
            const hay = `${i.id.replace(/_/g, " ")} ${i.name} ${i.categories.join(" ")} ${i.tags.join(" ")}`;
            return s ? hay.toLowerCase().includes(s) : !test || test.test(hay);
        }).slice(0, 120);
    }, [items, shelf, q]);

    return (
        <div className="pointer-events-auto w-full sm:w-[380px] max-h-[62vh] flex flex-col rounded-[24px] border border-[var(--p-line)] backdrop-blur-xl shadow-[var(--p-shadow)] overflow-hidden"
            style={{ backgroundColor: "var(--p-glass)" }} role="dialog" aria-label="Catalogue de meubles">
            <div className="p-3.5 pb-2 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--p-fg)]">{replacing ? "Remplacer le meuble" : "Ajouter un meuble"}</p>
                    <button type="button" onClick={onClose} aria-label="Fermer" className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--p-sunken)] text-[var(--p-muted)] hover:text-[var(--p-fg)]"><X size={14}/></button>
                </div>
                <label className="flex items-center gap-2 h-9 px-3 rounded-xl border border-[var(--p-line)] bg-[var(--p-field)]">
                    <Search size={14} className="text-[var(--p-muted)]"/>
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher (sofa, lamp, plant…)" aria-label="Rechercher un meuble"
                        className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-[var(--p-fg)]"/>
                </label>
                {!q && (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {SHELVES.map(s => (
                            <button key={s.id} type="button" onClick={() => setShelf(s.id)} aria-pressed={shelf === s.id}
                                className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold ${shelf === s.id ? "bg-[var(--p-invert-bg)] text-[var(--p-invert-fg)]" : "bg-[var(--p-sunken)] text-[var(--p-fg-2)]"}`}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-3.5 pb-3.5">
                {error ? (
                    <p className="text-sm text-[var(--p-negative)] py-6 text-center">{error}</p>
                ) : !items ? (
                    <p className="text-sm text-[var(--p-muted)] py-8 flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin"/> Chargement de la bibliothèque…</p>
                ) : !shown.length ? (
                    <p className="text-sm text-[var(--p-muted)] py-8 text-center">Aucun meuble ici.</p>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {shown.map(i => (
                            <button key={i.id} type="button" onClick={() => onPick(i)} title={i.name}
                                className="rounded-2xl overflow-hidden border border-[var(--p-line)] text-left hover:border-[var(--p-accent)] transition-colors" style={{ backgroundColor: "var(--p-card)" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- vignettes externes, dimensions fixes */}
                                <img src={i.thumb} alt="" loading="lazy" className="w-full aspect-square object-contain bg-white"/>
                                <span className="block px-1.5 py-1 text-[10.5px] font-medium text-[var(--p-fg-2)] truncate">{i.name}</span>
                            </button>
                        ))}
                    </div>
                )}
                <p className="text-[10.5px] text-[var(--p-muted)] mt-3">Powered by Poly Haven — modèles 3D libres de droits (CC0), hébergés par Patrim.</p>
            </div>
        </div>
    );
}
