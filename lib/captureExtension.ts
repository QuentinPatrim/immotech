/* ============================================================
   EXTENSION CHROME « Patrim – Capture d'annonces »
   Sources de l'extension (Manifest V3), assemblées à la demande
   par /api/extension avec l'adresse du site qui la distribue :
   téléchargée depuis la version de test, elle ouvre la version
   de test ; depuis la production, la production.

   Deux usages :
   1. Clic sur l'icône → lecture de la page du portail affichée
      (cartes d'annonces, texte, images, JSON-LD) → ouverture de
      /capture avec les données compressées dans l'adresse (#d=…).
   2. Recherche guidée depuis un dossier : l'app (page Patrim) demande
      à l'extension, via un petit script « pont », d'ouvrir les
      recherches pré-remplies sur les portails ; l'extension les
      ouvre dans une fenêtre, lit chaque page de résultats comme
      l'agent la verrait, referme la fenêtre et renvoie les pages
      à l'app. Uniquement les portails listés ci-dessous, uniquement
      à la demande de l'agent, une page à la fois.
   ============================================================ */

export const EXTENSION_VERSION = "1.1.0";

/** Portails que la recherche guidée peut ouvrir et lire (sous-domaines compris) */
export const PORTAL_DOMAINS = ["leboncoin.fr", "seloger.com", "bienici.com"];

/** Motif d'URL Chrome pour l'origine de l'app, sans port : il couvre alors tous les ports (utile en local) */
function appMatchPattern(appUrl: string) {
    const u = new URL(appUrl);
    return `${u.protocol}//${u.hostname}/*`;
}

export function extensionManifest(appUrl: string) {
    return {
        manifest_version: 3,
        name: "Patrim – Capture d'annonces",
        short_name: "Patrim",
        version: EXTENSION_VERSION,
        description: "Recherche et lit les annonces similaires (Leboncoin, SeLoger, Bien'ici…) pour votre dossier d'estimation Patrim.",
        permissions: ["activeTab", "scripting"],
        host_permissions: PORTAL_DOMAINS.map(d => `https://*.${d}/*`),
        action: {
            default_title: "Capturer les annonces de cette page (Patrim)",
            default_icon: { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
        },
        icons: { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
        background: { service_worker: "background.js" },
        content_scripts: [{ matches: [appMatchPattern(appUrl)], js: ["bridge.js"], run_at: "document_start" }],
    };
}

/**
 * Script « pont » injecté dans les pages de l'app Patrim : signale la présence
 * de l'extension et relaie les demandes de recherche guidée vers l'extension.
 */
export function extensionBridge() {
    return `// Patrim – pont entre l'app et l'extension (v${EXTENSION_VERSION})
(function () {
    var VERSION = ${JSON.stringify(EXTENSION_VERSION)};
    var post = function (msg) { msg.source = "patrim-ext"; window.postMessage(msg, location.origin); };
    document.documentElement.setAttribute("data-patrim-extension", VERSION);
    window.addEventListener("message", function (e) {
        if (e.source !== window || !e.data || e.data.source !== "patrim-app") return;
        var d = e.data;
        if (d.type === "ping") { post({ type: "pong", id: d.id, version: VERSION }); return; }
        if (d.type === "search") {
            try {
                chrome.runtime.sendMessage({ type: "patrim:search", id: d.id, searches: d.searches }, function (res) {
                    var err = chrome.runtime.lastError;
                    post({ type: "result", id: d.id, result: err ? { error: err.message } : res });
                });
            } catch (err) {
                post({ type: "result", id: d.id, result: { error: "Extension rechargée : actualisez la page." } });
            }
        }
    });
    chrome.runtime.onMessage.addListener(function (msg) {
        if (msg && msg.type === "patrim:progress") post({ type: "progress", id: msg.id, step: msg.step });
    });
    post({ type: "ready", version: VERSION });
})();
`;
}

/** Service worker de l'extension (JavaScript exécuté par Chrome) */
export function extensionBackground(appUrl: string) {
    return `// Patrim – Capture d'annonces (v${EXTENSION_VERSION})
var APP_URL = ${JSON.stringify(appUrl.replace(/\/$/, ""))};
var PORTAL_DOMAINS = ${JSON.stringify(PORTAL_DOMAINS)};
var MAX_SEARCHES = 6; // tout doit tenir dans les 5 minutes qu'accorde Chrome à une réponse
var busy = false;

// ---- Recherche guidée demandée par l'app (via bridge.js) ----
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg || msg.type !== "patrim:search") return;
    var from = (sender && sender.url) || "";
    if (from.indexOf(APP_URL + "/") !== 0 || !sender.tab) { sendResponse({ error: "Origine non autorisée" }); return; }
    if (busy) { sendResponse({ error: "Une recherche est déjà en cours dans une autre fenêtre." }); return; }
    busy = true;
    runSearches(msg.id, msg.searches || [], sender.tab)
        .then(sendResponse)
        .catch(function (e) { sendResponse({ error: String((e && e.message) || e) }); })
        .finally(function () { busy = false; });
    return true; // réponse asynchrone
});

function allowedUrl(u) {
    try {
        var x = new URL(u);
        return x.protocol === "https:" && PORTAL_DOMAINS.some(function (d) { return x.hostname === d || x.hostname.slice(-(d.length + 1)) === "." + d; });
    } catch (e) { return false; }
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function progress(appTab, id, step) {
    try { chrome.tabs.sendMessage(appTab.id, { type: "patrim:progress", id: id, step: step }).catch(function () { /* onglet fermé */ }); } catch (e) { /* idem */ }
}

function waitComplete(tabId, timeoutMs) {
    return new Promise(function (resolve) {
        var done = false;
        var finish = function () { if (done) return; done = true; chrome.tabs.onUpdated.removeListener(listener); clearTimeout(timer); resolve(); };
        var listener = function (id, info) { if (id === tabId && info.status === "complete") finish(); };
        var timer = setTimeout(finish, timeoutMs);
        chrome.tabs.onUpdated.addListener(listener);
        chrome.tabs.get(tabId, function (t) { if (!chrome.runtime.lastError && t && t.status === "complete") finish(); });
    });
}

// Attend que des annonces (liens avec un prix) soient affichées : pages construites dans le navigateur (8 s max)
function waitForListings() {
    return new Promise(function (resolve) {
        var start = Date.now();
        var price = /\\d[\\d\\s\\u00a0\\u202f.]{2,}\\s?€/;
        var check = function () {
            var n = 0, links = document.querySelectorAll("a[href]");
            for (var i = 0; i < links.length && n < 3; i++) {
                var el = links[i];
                for (var up = 0; up < 6 && el && el !== document.body; up++) {
                    var t = el.textContent || "";
                    if (t.length > 2000) break;
                    if (price.test(t)) { n++; break; }
                    el = el.parentElement;
                }
            }
            if (n >= 3 || Date.now() - start > 8000) setTimeout(function () { resolve(n); }, 700);
            else setTimeout(check, 400);
        };
        check();
    });
}

// Défile la page pour déclencher le chargement des annonces et des photos, puis revient en haut
function scrollPage() {
    return new Promise(function (resolve) {
        var y = 0, steps = 0;
        var tick = function () {
            y += Math.max(400, window.innerHeight * 0.8);
            window.scrollTo(0, y);
            steps++;
            if (y < document.body.scrollHeight && steps < 25) setTimeout(tick, 180);
            else setTimeout(function () { window.scrollTo(0, 0); resolve(true); }, 400);
        };
        tick();
    });
}

async function runSearches(id, searches, appTab) {
    searches = searches.filter(function (s) { return s && allowedUrl(s.url); }).slice(0, MAX_SEARCHES);
    if (!searches.length) return { error: "Aucune recherche valide" };
    var granted = await chrome.permissions.contains({ origins: PORTAL_DOMAINS.map(function (d) { return "https://*." + d + "/*"; }) });
    if (!granted) return { error: "L'accès de l'extension aux portails est désactivé : autorisez-le dans les réglages de l'extension Patrim (chrome://extensions)." };
    progress(appTab, id, { phase: "open", total: searches.length });
    var win = await chrome.windows.create({ url: searches.map(function (s) { return s.url; }), focused: true, type: "normal", width: 1280, height: 900 });
    var tabs = (win.tabs || []).slice();
    var pages = [];
    var keep = [];
    for (var i = 0; i < searches.length; i++) {
        var s = searches[i], tab = tabs[i];
        var out = { key: s.key, label: s.label, url: s.url, status: "error" };
        try {
            if (!tab) throw new Error("Onglet non ouvert");
            // Fenêtre au premier plan et onglet affiché : une page cachée ne charge pas ses annonces
            await chrome.windows.update(win.id, { focused: true });
            await chrome.tabs.update(tab.id, { active: true, autoDiscardable: false });
            await waitComplete(tab.id, 20000);
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: waitForListings });
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scrollPage });
            await sleep(600);
            var res = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: capturePage });
            var data = res && res[0] && res[0].result;
            if (!data) throw new Error("Page illisible");
            out.page = data;
            out.status = data.cards.length ? "ok" : data.blocked ? "blocked" : "empty";
            // Vérification anti-robot : la page reste ouverte pour l'agent. Page 1 sans résultat : aussi
            // (critères à revoir). Page 2 vide : simple fin des résultats, refermée.
            var later = /-(\\d+)$/.exec(s.key || "");
            if (!data.cards.length && (data.blocked || !(later && Number(later[1]) > 1))) keep.push(tab.id);
        } catch (e) {
            out.error = String((e && e.message) || e);
            if (tab) keep.push(tab.id);
        }
        pages.push(out);
        progress(appTab, id, { phase: "read", done: i + 1, total: searches.length, key: s.key, label: s.label, status: out.status, cards: out.page ? out.page.cards.length : 0 });
    }
    // On ne referme que les onglets ouverts par l'extension (ceux que l'agent a ouverts restent) ;
    // la fenêtre se ferme d'elle-même quand son dernier onglet part.
    await Promise.all(tabs.filter(function (t) { return keep.indexOf(t.id) < 0; }).map(function (t) {
        return chrome.tabs.remove(t.id).catch(function () { /* déjà fermé */ });
    }));
    if (!keep.length) {
        try {
            await chrome.windows.update(appTab.windowId, { focused: true });
            await chrome.tabs.update(appTab.id, { active: true });
        } catch (e) { /* onglet de l'app fermé */ }
    }
    return { version: ${JSON.stringify(EXTENSION_VERSION)}, pages: pages };
}

// ---- Clic sur l'icône : capture de la page affichée ----

chrome.action.onClicked.addListener(async function (tab) {
    if (!tab || !tab.id || !/^https?:/.test(tab.url || "")) return;
    try {
        chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#8a0e01" });
        chrome.action.setBadgeText({ tabId: tab.id, text: "…" });
        var results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: capturePage });
        var data = results && results[0] && results[0].result;
        if (!data) throw new Error("Page illisible");
        var encoded = await encode(data);
        await chrome.tabs.create({ url: APP_URL + "/capture#d=" + encoded, index: tab.index + 1 });
        chrome.action.setBadgeText({ tabId: tab.id, text: String(data.cards.length || 1) });
    } catch (e) {
        chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
        console.error("Capture Patrim :", e);
    }
});

async function encode(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    var buf = new Uint8Array(await new Response(stream).arrayBuffer());
    var bin = "";
    for (var i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
}

// Exécutée DANS la page du portail : lit ce que l'agent voit, sans rien modifier.
function capturePage() {
    var abs = function (u) { try { return new URL(u, location.href).href; } catch (e) { return ""; } };
    var clean = function (t, n) { return (t || "").replace(/\\s+/g, " ").trim().slice(0, n); };
    var imgOf = function (root) {
        var imgs = root.querySelectorAll("img");
        for (var k = 0; k < imgs.length; k++) {
            var img = imgs[k];
            var src = img.currentSrc || img.src || img.getAttribute("data-src") || img.getAttribute("data-lazy") || "";
            if (!src || src.indexOf("data:") === 0) {
                var set = img.getAttribute("srcset") || img.getAttribute("data-srcset") || "";
                src = set.split(",")[0].trim().split(" ")[0];
            }
            if (src && src.indexOf("data:") !== 0 && !/logo|avatar|icon|sprite|pixel/i.test(src)) return abs(src);
        }
        var bg = root.querySelector("[style*='background-image']");
        var m = bg && (bg.getAttribute("style") || "").match(/url\\(["']?([^"')]+)/);
        return m ? abs(m[1]) : undefined;
    };
    var price = /\\d[\\d\\s\\u00a0\\u202f.]{2,}\\s?€/;
    var housing = /m²|m2|pi[eè]ce|chambre|appartement|maison|studio|duplex|villa/i;

    // Cartes d'annonces : plus petit bloc autour d'un lien qui contient un prix et une surface/pièces
    var cards = [], seenHref = {}, seenText = {};
    var anchors = document.querySelectorAll("a[href]");
    for (var i = 0; i < anchors.length && cards.length < 60; i++) {
        var a = anchors[i];
        var raw = a.getAttribute("href") || "";
        if (!raw || raw.charAt(0) === "#" || raw.indexOf("javascript:") === 0 || raw.indexOf("mailto:") === 0 || raw.indexOf("tel:") === 0) continue;
        var href = abs(raw);
        if (!href || seenHref[href] || href.split("#")[0] === location.href.split("#")[0]) continue;
        var el = a, card = null;
        for (var up = 0; up < 8 && el && el !== document.body; up++) {
            var t = el.innerText || "";
            if (t.length > 2000) break;
            if (price.test(t) && housing.test(t)) { card = el; break; }
            el = el.parentElement;
        }
        if (!card) continue;
        var text = clean(card.innerText, 900);
        seenHref[href] = true;
        if (seenText[text]) continue;
        seenText[text] = true;
        cards.push({ href: href, text: text, img: imgOf(card) });
    }

    var meta = function (p) {
        var m = document.querySelector("meta[property='" + p + "'], meta[name='" + p + "']");
        return (m && m.getAttribute("content")) || undefined;
    };
    var jsonLd = [];
    document.querySelectorAll("script[type='application/ld+json']").forEach(function (s) {
        if (jsonLd.length < 6 && s.textContent) jsonLd.push(s.textContent.slice(0, 8000));
    });
    var images = [];
    for (var j = 0; j < document.images.length && images.length < 12; j++) {
        var im = document.images[j];
        var u = im.currentSrc || im.src;
        if ((im.naturalWidth || im.width) >= 300 && u && u.indexOf("data:") !== 0) images.push(abs(u));
    }
    var og = meta("og:image");
    // Page de vérification anti-robot (DataDome, captcha…) plutôt qu'une page de résultats
    var blocked = !!document.querySelector("iframe[src*='captcha-delivery.com'], iframe[src*='captcha'], iframe[src*='datadome']")
        || /captcha|robot|access denied|acc[eè]s refus|v[ée]rification/i.test(document.title || "");
    return {
        v: 1,
        blocked: blocked,
        url: location.href,
        title: document.title,
        host: location.hostname,
        capturedAt: new Date().toISOString(),
        cards: cards,
        text: (document.body.innerText || "").replace(/[ \\t]+/g, " ").replace(/\\n{3,}/g, "\\n\\n").slice(0, 20000),
        jsonLd: jsonLd,
        meta: { ogTitle: meta("og:title"), ogImage: og ? abs(og) : undefined, ogDescription: meta("og:description"), description: meta("description") },
        images: images
    };
}
`;
}

/** Icône : carré bordeaux Patrim avec un « P » blanc */
export function extensionIconSvg(size: number) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
        <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#8a0e01"/><stop offset="1" stop-color="#d35f52"/></linearGradient></defs>
        <rect width="128" height="128" rx="28" fill="url(#g)"/>
        <path fill="#ffffff" fill-rule="evenodd" d="M42 30h30c16 0 27 10 27 25s-11 25-27 25H58v22H42V30zm16 14v22h13c8 0 12-4 12-11s-4-11-12-11H58z"/>
    </svg>`;
}
