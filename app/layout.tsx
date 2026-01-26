import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout"; // Important : On importe le gestionnaire d'anim

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ImmoTech",
  description: "Gestion de patrimoine personnel",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-black text-zinc-100 overflow-x-hidden`}>
        {/* On enveloppe l'application avec ClientLayout qui gère le Splash Screen */}
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}