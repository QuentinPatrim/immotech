/* ============================================================
   PLAN 3D — CHARGEMENT DE PDF.JS
   pdf.js (pdfjs-dist 5) utilise Map.prototype.getOrInsertComputed,
   méthode JavaScript récente absente de nombreux navigateurs
   (Safari, Chrome < 2026…) : rendu des pages impossible sans elle.
   On l'ajoute dans la page ET dans le worker de pdf.js, créé ici
   (la rustine s'exécute avant le moteur officiel).
   ============================================================ */

const UPSERT_POLYFILL = `(() => {
    for (const C of [Map, WeakMap]) {
        const p = C.prototype;
        if (!p.getOrInsertComputed) Object.defineProperty(p, "getOrInsertComputed", { configurable: true, writable: true, value(key, fn) { if (this.has(key)) return this.get(key); const v = fn(key); this.set(key, v); return v; } });
        if (!p.getOrInsert) Object.defineProperty(p, "getOrInsert", { configurable: true, writable: true, value(key, v) { if (this.has(key)) return this.get(key); this.set(key, v); return v; } });
    }
})();`;

type Upsert = {
    has(k: unknown): boolean; get(k: unknown): unknown; set(k: unknown, v: unknown): unknown;
    getOrInsertComputed?: unknown; getOrInsert?: unknown;
};

/** Même rustine que UPSERT_POLYFILL, pour la page (sans évaluation de texte) */
function installPolyfill() {
    for (const C of [Map, WeakMap]) {
        const p = C.prototype as unknown as Upsert;
        if (!p.getOrInsertComputed) {
            Object.defineProperty(p, "getOrInsertComputed", {
                configurable: true, writable: true,
                value(this: Upsert, key: unknown, fn: (k: unknown) => unknown) { if (this.has(key)) return this.get(key); const v = fn(key); this.set(key, v); return v; },
            });
        }
        if (!p.getOrInsert) {
            Object.defineProperty(p, "getOrInsert", {
                configurable: true, writable: true,
                value(this: Upsert, key: unknown, v: unknown) { if (this.has(key)) return this.get(key); this.set(key, v); return v; },
            });
        }
    }
}

let workerReady = false;

/** pdf.js prêt à l'emploi (rustine installée, worker configuré) */
export async function loadPdfjs() {
    installPolyfill();
    const pdfjsLib = await import("pdfjs-dist");
    if (!workerReady) {
        workerReady = true;
        const src = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        try {
            // Worker module : rustine puis code du moteur officiel dans un même fichier (aucune attente
            // au démarrage : le premier message de pdf.js n'est pas perdu)
            const res = await fetch(src);
            if (!res.ok) throw new Error(`pdf.worker ${res.status}`);
            const url = URL.createObjectURL(new Blob([UPSERT_POLYFILL, "\n", await res.text()], { type: "text/javascript" }));
            pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(url, { type: "module" });
        } catch {
            pdfjsLib.GlobalWorkerOptions.workerSrc = src;
        }
    }
    return pdfjsLib;
}
