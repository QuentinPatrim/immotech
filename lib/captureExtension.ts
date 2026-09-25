/* ============================================================
   EXTENSION CHROME « Patrim – Capture d'annonces »
   Sources de l'extension (Manifest V3), assemblées à la demande
   par /api/extension avec l'adresse du site qui la distribue :
   téléchargée depuis la version de test, elle ouvre la version
   de test ; depuis la production, la production.

   Fonctionnement : clic sur l'icône → lecture de la page du portail
   affichée (cartes d'annonces, texte, images, JSON-LD) → ouverture
   de /capture avec les données compressées dans l'adresse (#d=…).
   Aucune donnée n'est lue sans ce clic (permission activeTab).
   ============================================================ */

export const EXTENSION_VERSION = "1.0.0";

export function extensionManifest() {
    return {
        manifest_version: 3,
        name: "Patrim – Capture d'annonces",
        short_name: "Patrim",
        version: EXTENSION_VERSION,
        description: "Envoie en un clic les annonces affichées (Leboncoin, SeLoger, Bien'ici, PAP…) dans votre dossier d'estimation Patrim.",
        permissions: ["activeTab", "scripting"],
        action: {
            default_title: "Capturer les annonces de cette page (Patrim)",
            default_icon: { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
        },
        icons: { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
        background: { service_worker: "background.js" },
    };
}

/** Service worker de l'extension (JavaScript exécuté par Chrome) */
export function extensionBackground(appUrl: string) {
    return `// Patrim – Capture d'annonces (v${EXTENSION_VERSION})
var APP_URL = ${JSON.stringify(appUrl.replace(/\/$/, ""))};

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
    return {
        v: 1,
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
