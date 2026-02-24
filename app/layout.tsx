import type { Metadata, Viewport } from "next"; // Ajout de Viewport
import { Inter } from "next/font/google"; // Si tu utilises Inter, sinon garde tes imports
import "./globals.css";
import SplashScreen from "@/components/SplashScreen";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] }); // Optionnel selon ta config

export const metadata: Metadata = {
  title: "Nexus Invest",
  description: "Gestion de Patrimoine",
};

// 👇 C'EST CE BLOC QUI RÉGLE LE PROBLÈME DE LA BARRE VERTE
export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Empêche le zoom qui casse souvent le layout sur mobile
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-[#050505] text-white overflow-x-hidden"> {/* overflow-x-hidden est une sécurité en plus */}
        <div className="flex">
           {/* Sidebar simplifiée pour l'exemple, garde ta logique de loading si besoin */}
           <div className="flex-1">
               {children}
           </div>
        </div>
      </body>
    </html>
  );
}