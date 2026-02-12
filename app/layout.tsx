import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout"; // On importe notre nouveau composant

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexus | Gestion de Patrimoine",
  description: "Analysez et optimisez votre patrimoine.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.className} bg-[#050505] text-white overflow-x-hidden`}>
        {/* On enveloppe tout le contenu dans notre AppLayout Client */}
        <AppLayout>
            {children}
        </AppLayout>
      </body>
    </html>
  );
}