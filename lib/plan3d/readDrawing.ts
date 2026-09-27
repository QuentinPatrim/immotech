/* ============================================================
   PLAN 3D — CONSTRUCTION À PARTIR DU DESSIN (navigateur)
   1. Noms de pièces : textes du PDF (position exacte) associés au
      tableau des surfaces du diagnostic, ou pièces relevées par l'IA
      (plans en image) ;
   2. lecture directe du dessin (vectorize) ;
   3. conversion en mètres (planFromModel) ;
   4. recalage des cloisons sur les surfaces du tableau (fitAreas),
      le croquis d'un diagnostiqueur n'étant pas à l'échelle.
   ============================================================ */

import { centroid, polygonArea } from "@/lib/plan3d/geometry";
import { fitAreas } from "@/lib/plan3d/fitAreas";
import { kindFromLabel, type CarrezTable } from "@/lib/plan3d/ddt";
import { planFromModel } from "@/lib/plan3d/modelPlan";
import { vectorizePlan, type Seed, type TextBox } from "@/lib/plan3d/vectorize";
import type { PlanImage, PlanText } from "@/lib/plan3d/pdfToImage";
import type { Plan3D, RoomKind } from "@/lib/plan3d/types";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const fr = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/** Textes d'une même ligne rapprochés (« Dégagem » + « ent ») */
function mergeLines(texts: PlanText[]): PlanText[] {
    const items = texts.map(t => ({ ...t, str: t.str.trim() })).filter(t => t.str).sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2 || a.x0 - b.x0);
    const lines: PlanText[] = [];
    for (const t of items) {
        const h = t.y1 - t.y0 || 10;
        const last = lines.find(l => Math.abs((l.y0 + l.y1) / 2 - (t.y0 + t.y1) / 2) < h * 0.5 && t.x0 - l.x1 < h * 1.2 && t.x0 >= l.x0);
        if (last) {
            const gap = t.x0 - last.x1;
            last.str = gap > h * 0.25 ? `${last.str} ${t.str}` : `${last.str}${t.str}`;
            last.x1 = Math.max(last.x1, t.x1); last.y0 = Math.min(last.y0, t.y0); last.y1 = Math.max(last.y1, t.y1);
        } else lines.push({ ...t });
    }
    return lines;
}

/** Noms de pièces écrits sur le dessin, associés au tableau des surfaces quand il existe */
export function seedsFromTexts(texts: PlanText[], table: CarrezTable | null): Seed[] {
    const rows = table ? [...table.rooms, ...table.outdoor] : [];
    const used = new Set<number>();
    const seeds: Seed[] = [];
    for (const l of mergeLines(texts)) {
        const label = l.str.replace(/\s+/g, " ").trim();
        // Lignes du tableau (niveau, surfaces) ou textes longs : ce ne sont pas des étiquettes du dessin
        if (label.length > 28 || /\d+[.,]\d/.test(label) || /[ée]tage|niveau|surface|superficie/i.test(label)) continue;
        const n = norm(label);
        let row = rows.findIndex((r, i) => !used.has(i) && norm(r.name) === n);
        if (row < 0) row = rows.findIndex((r, i) => !used.has(i) && (norm(r.name).startsWith(n) || n.startsWith(norm(r.name))) && n.length >= 3);
        const kind: RoomKind | null = row >= 0 ? rows[row].kind : kindFromLabel(label);
        if (!kind) continue;
        if (row < 0) {
            const sameKind = rows.map((r, i) => ({ r, i })).filter(o => !used.has(o.i) && o.r.kind === kind);
            if (sameKind.length === 1) row = sameKind[0].i;
        }
        if (row >= 0) used.add(row);
        seeds.push({ name: row >= 0 ? rows[row].name : label, kind, x: (l.x0 + l.x1) / 2, y: (l.y0 + l.y1) / 2, area: row >= 0 ? rows[row].area : null });
    }
    return seeds;
}

/** Pièces relevées par l'IA → noms positionnés sur l'image (plans en image, sans texte lisible) */
export function seedsFromPlan(plan: Plan3D, table: CarrezTable | null): Seed[] {
    const src = plan.source;
    if (!src || !(src.pxPerMeter > 0)) return [];
    const rows = table ? [...table.rooms, ...table.outdoor] : [];
    return plan.rooms.map(r => {
        const c = centroid(r.polygon);
        const row = rows.find(x => norm(x.name) === norm(r.name));
        return { name: r.name, kind: r.kind, x: c.x * src.pxPerMeter + src.originPx.x, y: c.y * src.pxPerMeter + src.originPx.y, area: row?.area ?? null };
    });
}

/** Cloisons recalées sur les surfaces du tableau (pièces associées par leur nom) */
export function refineWithTable(plan: Plan3D, table: CarrezTable | null): { plan: Plan3D; note: string | null } {
    if (!table) return { plan, note: null };
    const rows = [...table.rooms, ...table.outdoor];
    const targets = new Map<string, number>();
    for (const r of plan.rooms) {
        const row = rows.find(x => norm(x.name) === norm(r.name));
        if (row) targets.set(r.id, row.area);
    }
    // Placard non listé au tableau : compté dans la pièce qu'il dessert (« Placard Entrée » → Entrée)
    const groups = new Map<string, string>();
    for (const r of plan.rooms) {
        if (targets.has(r.id) || !/^placard/.test(norm(r.name))) continue;
        const owner = plan.rooms.find(o => o !== r && targets.has(o.id) && norm(r.name) === `placard${norm(o.name)}`);
        if (owner) groups.set(r.id, owner.id);
    }
    if (targets.size < 2) return { plan, note: null };
    const fit = fitAreas(plan, targets, groups);
    if (!fit.fitted || fit.after >= fit.before) return { plan, note: null };
    return {
        plan: fit.plan,
        note: `Cloisons recalées sur les surfaces du diagnostic (écart moyen ${fr(fit.before * 100)} % → ${fr(fit.after * 100)} %) : le croquis n'était pas à l'échelle.`,
    };
}

/**
 * Plan construit directement à partir du dessin. null si le dessin n'est pas
 * exploitable (l'appelant se rabat alors sur la lecture par l'IA).
 */
export function planFromDrawing(image: PlanImage, seeds: Seed[], table: CarrezTable | null, opts: { declared?: number; imageUrl?: string; textBoxes?: TextBox[] }): { plan: Plan3D; notes: string[] } | null {
    if (seeds.length < 2) return null;
    const v = vectorizePlan(image.pixels, seeds, opts.textBoxes);
    if (!v || v.found.length < Math.max(2, Math.ceil(seeds.length * 0.6))) return null;
    const total = table?.total;
    const { plan, notes } = planFromModel(v.plan, {
        widthPx: image.width, heightPx: image.height,
        declaredSurface: total ?? opts.declared,
        carrezTotal: total,
        imageUrl: opts.imageUrl,
    });
    if (plan.rooms.length < 2 || plan.rooms.every(r => polygonArea(r.polygon) < 0.5)) return null;
    const refined = refineWithTable(plan, table);
    const out = [`Plan relevé directement sur le dessin (${v.found.length} pièce${v.found.length > 1 ? "s" : ""}).`];
    for (const p of v.placards) out.push(`${p.name} repéré à ses portes coulissantes : sa surface est comptée dans ${p.owner}, comme dans le rapport.`);
    if (refined.note) out.push(refined.note);
    else out.push(...notes.filter(n => !n.startsWith("Échelle")));
    if (v.missing.length) out.push(`Non retrouvé sur le dessin : ${v.missing.join(", ")} — à ajouter dans l'éditeur 2D.`);
    return { plan: refined.plan, notes: out };
}
