import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 1. Importer le gestionnaire
import ClientSplash from "@/components/ClientSplash"; 

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Nexus | Patrimoine & Finance",
  description: "Pilotez votre patrimoine et optimisez votre budget avec Nexus.",
  manifest: "/manifest.json",
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nexus",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {/* 2. Ajouter le Splash ici, au dessus de tout */}
        <ClientSplash />
        
        {children}
      </body>
    </html>
  );
}