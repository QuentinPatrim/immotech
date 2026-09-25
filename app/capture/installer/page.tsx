"use client";

/* ============================================================
   PAGE : /capture/installer
   Installation de l'extension Chrome / Edge « Patrim – Capture
   d'annonces » (une seule fois par poste) et mode d'emploi.
   ============================================================ */

import Link from "next/link";
import { ArrowLeft, Download, Puzzle, MousePointerClick, ListChecks, Search, RefreshCw } from "lucide-react";
import { EXTENSION_VERSION } from "@/lib/captureExtension";
import ThemeToggle from "@/components/estimation/ThemeToggle";

const INSTALL_STEPS = [
    { title: "Téléchargez l'extension", text: "Puis décompressez le fichier (double-clic) : vous obtenez un dossier « patrim-capture »." },
    { title: "Ouvrez la page des extensions", text: "Dans Chrome, tapez chrome://extensions dans la barre d'adresse (Edge : edge://extensions)." },
    { title: "Activez le « Mode développeur »", text: "Interrupteur en haut à droite de la page (Edge : en bas à gauche). Laissez-le activé : depuis Chrome 134, le désactiver coupe l'extension." },
    { title: "Chargez le dossier", text: "Cliquez sur « Charger l'extension non empaquetée » et choisissez le dossier « patrim-capture ». Chrome indique qu'elle peut lire leboncoin.fr, seloger.com et bienici.com : c'est ce qui lui permet d'y lancer vos recherches." },
    { title: "Épinglez l'icône", text: "Cliquez sur la pièce de puzzle à droite de la barre d'adresse, puis sur l'épingle à côté de « Patrim »." },
];

const UPDATE_STEPS = [
    "Téléchargez la nouvelle version ci-dessus et décompressez-la.",
    "Sur chrome://extensions, cliquez sur « Supprimer » sous l'ancienne extension Patrim.",
    "« Charger l'extension non empaquetée » → dossier « patrim-capture » de la nouvelle version, puis actualisez vos pages Patrim ouvertes.",
];

const USE_STEPS = [
    { icon: Search, title: "Recherche automatique", text: "À l'étape « Marché » d'un dossier, cliquez sur « Chercher les annonces similaires » : l'extension ouvre Leboncoin, SeLoger et Bien'ici déjà filtrés sur votre bien, lit les résultats et referme la fenêtre." },
    { icon: ListChecks, title: "Seulement les biens similaires", text: "L'IA lit chaque annonce (prix, surface, parution, baisses, particularités) ; celles trop éloignées ou trop différentes de votre bien sont écartées. Cochez celles à citer dans l'avis de valeur." },
    { icon: MousePointerClick, title: "Ou un clic sur n'importe quelle page", text: "Sur une annonce ou une page de résultats d'un autre portail (PAP, Logic-Immo, Figaro Immo…), cliquez sur l'icône Patrim pour l'ajouter au dossier." },
];

export default function InstallerPage() {
    return (
        <div className="patrim-ui inst-body min-h-screen">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter+Tight:wght@400;500;600;700&display=swap');
                .inst-body { font-family: 'Inter Tight', Inter, sans-serif; }
                .inst-display { font-family: 'Fraunces', Georgia, serif; }`}</style>
            <header className="max-w-4xl mx-auto px-6 pt-8 flex items-center justify-between">
                <Link href="/mes-biens" className="text-sm text-[var(--p-muted)] hover:text-[var(--p-fg)] inline-flex items-center gap-2"><ArrowLeft size={15}/> Mes biens</Link>
                <ThemeToggle/>
            </header>
            <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
                <div className="space-y-3">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--p-accent)] font-semibold flex items-center gap-2"><Puzzle size={14}/> Extension navigateur</p>
                    <h1 className="inst-display text-5xl text-[var(--p-fg)] leading-tight">Les annonces en vente,<br/>en un clic dans vos dossiers</h1>
                    <p className="text-[var(--p-muted)] max-w-2xl">Vous naviguez sur les portails comme d&apos;habitude : l&apos;extension Patrim envoie les annonces affichées dans votre dossier d&apos;estimation, avec leur photo, leur date de parution, leurs baisses de prix et une analyse de leurs particularités.</p>
                    <a href="/api/extension" className="inline-flex items-center gap-2 h-12 px-6 rounded-full text-sm font-semibold text-[#fff] mt-2" style={{ background: "linear-gradient(135deg, #8a0e01, #d35f52)" }}>
                        <Download size={16}/> Télécharger l&apos;extension {EXTENSION_VERSION} (Chrome, Edge)
                    </a>
                </div>

                <section className="rounded-[28px] border border-[var(--p-line)] p-8" style={{ backgroundColor: "var(--p-card)" }}>
                    <h2 className="inst-display text-2xl text-[var(--p-fg)] mb-6">Installation (une fois par poste)</h2>
                    <ol className="space-y-5">
                        {INSTALL_STEPS.map((s, i) => (
                            <li key={s.title} className="flex gap-4">
                                <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold text-[#fff]" style={{ background: "linear-gradient(135deg, #8a0e01, #d35f52)" }}>{i + 1}</span>
                                <div>
                                    <p className="font-semibold text-[var(--p-fg)]">{s.title}</p>
                                    <p className="text-sm text-[var(--p-muted)]">{s.text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                <section id="mise-a-jour" className="rounded-[28px] border border-[var(--p-line)] p-8 scroll-mt-6" style={{ backgroundColor: "var(--p-card)" }}>
                    <h2 className="inst-display text-2xl text-[var(--p-fg)] mb-2 flex items-center gap-2"><RefreshCw size={18} className="text-[var(--p-accent)]"/> Mettre à jour une ancienne version</h2>
                    <p className="text-sm text-[var(--p-muted)] mb-4">Vous avez déjà installé une version précédente de l&apos;extension Patrim ? La version {EXTENSION_VERSION} est nécessaire pour la recherche automatique :</p>
                    <ol className="list-decimal pl-5 space-y-1.5 text-sm text-[var(--p-fg-2)]">
                        {UPDATE_STEPS.map(t => <li key={t}>{t}</li>)}
                    </ol>
                </section>

                <section className="grid md:grid-cols-3 gap-4">
                    {USE_STEPS.map(s => (
                        <div key={s.title} className="rounded-3xl border border-[var(--p-line)] p-6 space-y-2" style={{ backgroundColor: "var(--p-card)" }}>
                            <s.icon size={20} className="text-[var(--p-accent)]"/>
                            <p className="font-semibold text-[var(--p-fg)]">{s.title}</p>
                            <p className="text-sm text-[var(--p-muted)] leading-relaxed">{s.text}</p>
                        </div>
                    ))}
                </section>

                <p className="text-xs text-[var(--p-faint)] leading-relaxed">
                    L&apos;extension n&apos;agit qu&apos;à votre demande : un clic sur son icône (page affichée) ou sur « Chercher les annonces similaires » dans un dossier (une page de résultats par portail, ouverte dans votre navigateur comme vous le feriez). Elle ne collecte rien en arrière-plan : les portails interdisent la collecte massive de leurs annonces.
                </p>
            </main>
        </div>
    );
}
