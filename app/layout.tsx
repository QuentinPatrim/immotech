import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PATRIM_THEME_SCRIPT } from "@/lib/patrimThemeScript";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexus Invest",
  description: "Gestion de Patrimoine",
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        {/* Thème clair/sombre de l'espace agent, appliqué avant l'affichage */}
        <script dangerouslySetInnerHTML={{ __html: PATRIM_THEME_SCRIPT }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-[#050505] text-white overflow-x-hidden`}>
        <div className="flex">
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}