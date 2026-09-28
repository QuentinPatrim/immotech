/* ============================================================
   E-MAIL D'ENVOI DE L'AVIS DE VALEUR
   Modèle de message (modifiable, retenu sur l'appareil), formule
   de politesse tirée de la civilité et du nom du client, objet,
   liens d'ouverture dans Gmail, Outlook ou la messagerie de
   l'appareil.
   ============================================================ */

import { AGENCY_PHONE, PATRIM_AGENTS } from "@/lib/dossier";

export type Civility = "M." | "Mme" | "M. et Mme" | "";

export const CIVILITIES: { id: Civility; label: string }[] = [
    { id: "M.", label: "Monsieur" },
    { id: "Mme", label: "Madame" },
    { id: "M. et Mme", label: "Madame, Monsieur" },
    { id: "", label: "Sans civilité" },
];

export const DEFAULT_TEMPLATE = `{bonjour}

Comme convenu, veuillez trouver ci-joint l'estimation de {bien}.
Je reste à votre disposition pour tout complément d'information ou question de votre part.
Je suis joignable au {telephone}.

Bonne journée.

Cordialement,

{signature}`;

export const TEMPLATE_KEY = "patrim:mailTemplate";
export const PROVIDER_KEY = "patrim:mailProvider";
export const phoneKey = (agentId: string) => `patrim:agentPhone:${agentId || "_"}`;

const CIV_WORDS = /^(m\.?|mr\.?|mme\.?|mlle\.?|monsieur|madame|mademoiselle|&|et|\/|-)$/i;

/** Civilité devinée à partir du nom saisi (« M. & Mme Dupont », « Mme Martin »…) */
export function guessCivility(name: string): Civility {
    const s = name.trim().toLowerCase();
    const man = /^(m\.?|mr\.?|monsieur)(\s|$)/.test(s);
    const woman = /(^|\s)(mme\.?|madame|mlle\.?|mademoiselle)(\s|$)/.test(s);
    if (man && woman) return "M. et Mme";
    if (woman && /^(mme\.?|madame|mlle\.?|mademoiselle)(\s|$)/.test(s)) return "Mme";
    if (man) return "M.";
    return "";
}

/** Nom de famille pour la formule de politesse : sans civilité ; le mot en capitales, sinon le dernier */
export function familyName(name: string): string {
    const words = name.trim().split(/\s+/).filter(w => w && !CIV_WORDS.test(w));
    if (!words.length) return "";
    if (words.length === 1) return words[0];
    const caps = words.filter(w => w.length > 1 && w === w.toUpperCase() && /\p{L}/u.test(w));
    return caps.length ? caps.join(" ") : words[words.length - 1];
}

/** « Bonjour Madame, Monsieur Dupont, » */
export function greeting(civility: Civility, clientName: string): string {
    const n = familyName(clientName);
    const title = civility === "M." ? "Monsieur" : civility === "Mme" ? "Madame" : civility === "M. et Mme" ? "Madame, Monsieur" : "";
    if (title) return `Bonjour ${title}${n ? ` ${n}` : ""},`;
    return clientName.trim() ? `Bonjour ${clientName.trim()},` : "Bonjour Madame, Monsieur,";
}

export interface MailInput {
    clientName: string;
    civility: Civility;
    propertyType: string;
    propertyAddress: string;
    agentId: string;
    phone: string;
}

/** « votre appartement situé 12 rue …, 31000 Toulouse » */
export function propertyPhrase(type: string, address: string): string {
    const feminine = type === "Maison";
    const noun = type === "Appartement" ? "appartement" : type === "Maison" ? "maison" : "bien";
    const addr = address.trim().replace(/\s+/g, " ");
    return `votre ${noun}${addr ? ` situé${feminine ? "e" : ""} ${addr}` : ""}`;
}

export function agentPhone(agentId: string): string {
    return PATRIM_AGENTS.find(a => a.id === agentId)?.phone || AGENCY_PHONE;
}

export function signature(agentId: string): string {
    const a = PATRIM_AGENTS.find(x => x.id === agentId);
    return a ? `${a.name}\n${a.role} – Patrim` : "L'équipe Patrim";
}

/** Remplit le modèle : {bonjour}, {bien}, {adresse}, {telephone}, {signature} */
export function fillTemplate(template: string, m: MailInput): string {
    const values: Record<string, string> = {
        bonjour: greeting(m.civility, m.clientName),
        bien: propertyPhrase(m.propertyType, m.propertyAddress),
        adresse: m.propertyAddress.trim(),
        telephone: m.phone.trim() || AGENCY_PHONE,
        signature: signature(m.agentId),
    };
    return template.replace(/\{(bonjour|bien|adresse|telephone|signature)\}/g, (_, k: string) => values[k]);
}

export function mailSubject(type: string, address: string): string {
    const noun = type === "Appartement" ? "votre appartement" : type === "Maison" ? "votre maison" : "votre bien";
    const street = address.split(",")[0].replace(/\s*\d{5}.*$/, "").trim();
    return `Estimation de ${noun}${street ? ` – ${street}` : ""}`;
}

export type MailProvider = "gmail" | "outlook" | "device";

/** Fenêtre de rédaction pré-remplie (la pièce jointe s'ajoute ensuite à la main sur ordinateur) */
export function composeUrl(provider: MailProvider, to: string, subject: string, body: string): string {
    const e = encodeURIComponent;
    if (provider === "gmail") return `https://mail.google.com/mail/?view=cm&fs=1&to=${e(to)}&su=${e(subject)}&body=${e(body)}`;
    if (provider === "outlook") return `https://outlook.office.com/mail/deeplink/compose?to=${e(to)}&subject=${e(subject)}&body=${e(body)}`;
    return `mailto:${e(to).replace(/%40/g, "@")}?subject=${e(subject)}&body=${e(body)}`;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
