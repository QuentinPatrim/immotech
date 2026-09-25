"use client";

import type { CapturePayload } from "@/lib/marketListings";

/* ============================================================
   Dialogue avec l'extension Patrim depuis l'app (navigateur)
   L'extension injecte un petit script « pont » dans les pages de
   l'app : on lui parle par window.postMessage.
   ============================================================ */

/** Version minimale de l'extension pour la recherche guidée */
export const MIN_SEARCH_VERSION = "1.1.0";

export interface PortalSearch {
    key: string;
    label: string;
    url: string;
}

export interface SearchedPage {
    key: string;
    label: string;
    url: string;
    status: "ok" | "empty" | "blocked" | "error";
    page?: CapturePayload;
    error?: string;
}

export interface SearchProgress {
    phase: "open" | "read";
    done?: number;
    total: number;
    key?: string;
    label?: string;
    status?: SearchedPage["status"];
    cards?: number;
}

const newer = (a: string, b: string) => {
    const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
    return false;
};

/** Vrai si la version installée permet la recherche guidée */
export const supportsSearch = (version: string | null) => !!version && (version === MIN_SEARCH_VERSION || newer(version, MIN_SEARCH_VERSION));

/** Version de l'extension installée (null si absente ou antérieure au pont) */
export function detectExtension(timeoutMs = 1200): Promise<string | null> {
    if (typeof window === "undefined") return Promise.resolve(null);
    const attr = document.documentElement.getAttribute("data-patrim-extension");
    if (attr) return Promise.resolve(attr);
    return new Promise(resolve => {
        const id = `ping-${Math.random().toString(36).slice(2)}`;
        const done = (v: string | null) => { window.removeEventListener("message", onMsg); clearTimeout(timer); resolve(v); };
        const onMsg = (e: MessageEvent) => {
            if (e.source !== window || e.data?.source !== "patrim-ext") return;
            if ((e.data.type === "pong" && e.data.id === id) || e.data.type === "ready") done(String(e.data.version || ""));
        };
        const timer = setTimeout(() => done(document.documentElement.getAttribute("data-patrim-extension")), timeoutMs);
        window.addEventListener("message", onMsg);
        window.postMessage({ source: "patrim-app", type: "ping", id }, window.location.origin);
    });
}

/**
 * Demande à l'extension d'ouvrir les recherches sur les portails et de lire
 * les pages de résultats. Renvoie une entrée par recherche (lue ou non).
 */
export function runPortalSearches(searches: PortalSearch[], onProgress?: (p: SearchProgress) => void, idleMs = 90_000): Promise<SearchedPage[]> {
    return new Promise((resolve, reject) => {
        const id = `search-${Math.random().toString(36).slice(2)}`;
        let timer: ReturnType<typeof setTimeout>;
        // Délai relancé à chaque page lue : on n'abandonne que si l'extension ne donne plus signe de vie
        const arm = () => {
            clearTimeout(timer);
            timer = setTimeout(() => { cleanup(); reject(new Error("Les portails ont mis trop de temps à répondre.")); }, idleMs);
        };
        const cleanup = () => { window.removeEventListener("message", onMsg); clearTimeout(timer); };
        const onMsg = (e: MessageEvent) => {
            if (e.source !== window || e.data?.source !== "patrim-ext" || e.data.id !== id) return;
            if (e.data.type === "progress") { arm(); onProgress?.(e.data.step as SearchProgress); return; }
            if (e.data.type !== "result") return;
            cleanup();
            const r = e.data.result as { error?: string; pages?: SearchedPage[] } | undefined;
            if (!r || r.error || !Array.isArray(r.pages)) reject(new Error(r?.error || "L'extension n'a pas répondu."));
            else resolve(r.pages);
        };
        arm();
        window.addEventListener("message", onMsg);
        window.postMessage({ source: "patrim-app", type: "search", id, searches }, window.location.origin);
    });
}
