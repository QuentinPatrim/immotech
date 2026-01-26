"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, Wallet, PiggyBank, CheckCircle2, User } from "lucide-react";

export default function OnboardingWizard() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

  // --- DONNÉES ---
  // Identité (Nouveau)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");

  // Finances
  const [income, setIncome] = useState("");
  const [cash, setCash] = useState("");
  const [crypto, setCrypto] = useState("");
  const [stock, setStock] = useState("");
  const [immo, setImmo] = useState("");

  useEffect(() => {
    // Vérifie si l'utilisateur est déjà venu
    const hasVisited = localStorage.getItem("hasVisited");
    if (!hasVisited) {
      setIsOpen(true);
    }
  }, []);

  const handleSkip = () => {
    localStorage.setItem("hasVisited", "true");
    setIsOpen(false);
  };

  const handleFinish = () => {
    // 1. Sauvegarde Identité
    if (firstName) {
        localStorage.setItem("userProfile", JSON.stringify({ firstName, lastName, age }));
    }

    // 2. Sauvegarde Budget
    if (income) {
        const budgetData = { income: parseFloat(income), expenses: [] };
        localStorage.setItem("myBudget", JSON.stringify(budgetData));
    }

    // 3. Sauvegarde Patrimoine
    const newAssets = [];
    if (cash) newAssets.push({ id: "cash_start", name: "Épargne de départ", type: "Cash", value: parseFloat(cash) });
    if (crypto) newAssets.push({ id: "crypto_start", name: "Portefeuille Crypto", type: "Crypto", value: parseFloat(crypto) });
    if (stock) newAssets.push({ id: "stock_start", name: "Compte Titres / PEA", type: "Bourse", value: parseFloat(stock) });
    if (immo) newAssets.push({ id: "immo_start", name: "Immobilier", type: "Immobilier", value: parseFloat(immo) });

    if (newAssets.length > 0) {
        localStorage.setItem("myAssets", JSON.stringify(newAssets));
    }

    // 4. Marque comme visité et ferme
    localStorage.setItem("hasVisited", "true");
    
    // On enregistre la date de connexion pour le message "Heureux de vous revoir"
    localStorage.setItem("lastVisitDate", new Date().toDateString());
    
    setIsOpen(false);
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()}>
        
        {/* ÉTAPE 1 : BIENVENUE */}
        {step === 1 && (
            <>
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 text-emerald-500">
                        <Sparkles size={24} />
                    </div>
                    <DialogTitle className="text-center text-2xl">Bienvenue sur ImmoTech</DialogTitle>
                    <DialogDescription className="text-center text-zinc-400">
                        Configurons votre cockpit financier en 30 secondes.
                        Vos données restent stockées uniquement sur cet appareil.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6 flex justify-center">
                    <Button onClick={() => setStep(2)} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                        Commencer <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
                <div className="text-center">
                    <button onClick={handleSkip} className="text-xs text-zinc-500 hover:text-white underline">
                        Passer et configurer plus tard
                    </button>
                </div>
            </>
        )}

        {/* ÉTAPE 2 : IDENTITÉ (NOUVEAU) */}
        {step === 2 && (
            <>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><User className="text-emerald-500"/> Qui êtes-vous ?</DialogTitle>
                    <DialogDescription>Pour personnaliser votre expérience.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Prénom</Label>
                            <Input 
                                placeholder="Ex: Thomas" 
                                className="bg-zinc-900 border-zinc-800 mt-2"
                                value={firstName} onChange={(e) => setFirstName(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Nom</Label>
                            <Input 
                                placeholder="Ex: Durand" 
                                className="bg-zinc-900 border-zinc-800 mt-2"
                                value={lastName} onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Âge</Label>
                        <Input 
                            type="number"
                            placeholder="Ex: 30" 
                            className="bg-zinc-900 border-zinc-800 mt-2"
                            value={age} onChange={(e) => setAge(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setStep(3)} className="bg-white text-black hover:bg-zinc-200 w-full" disabled={!firstName}>
                        Suivant <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </DialogFooter>
            </>
        )}

        {/* ÉTAPE 3 : REVENUS */}
        {step === 3 && (
            <>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><PiggyBank className="text-blue-500"/> Vos Revenus</DialogTitle>
                    <DialogDescription>Pour calculer votre capacité d'épargne.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label>Salaire mensuel Net (avant impôt)</Label>
                        <Input 
                            type="number" 
                            placeholder="Ex: 2500" 
                            className="bg-zinc-900 border-zinc-800 mt-2"
                            value={income}
                            onChange={(e) => setIncome(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => setStep(4)} className="text-zinc-500">Passer</Button>
                    <Button onClick={() => setStep(4)} className="bg-white text-black hover:bg-zinc-200">
                        Suivant <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </DialogFooter>
            </>
        )}

        {/* ÉTAPE 4 : PATRIMOINE */}
        {step === 4 && (
            <>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Wallet className="text-purple-500"/> Votre Patrimoine actuel</DialogTitle>
                    <DialogDescription>Remplissez ce que vous possédez déjà (approximatif).</DialogDescription>
                </DialogHeader>
                <div className="py-4 grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs text-zinc-400">Cash (Livrets, Comptes)</Label>
                        <Input type="number" placeholder="0 €" className="bg-zinc-900 border-zinc-800 mt-1" value={cash} onChange={(e) => setCash(e.target.value)} />
                    </div>
                    <div>
                        <Label className="text-xs text-zinc-400">Bourse (PEA, CTO)</Label>
                        <Input type="number" placeholder="0 €" className="bg-zinc-900 border-zinc-800 mt-1" value={stock} onChange={(e) => setStock(e.target.value)} />
                    </div>
                    <div>
                        <Label className="text-xs text-zinc-400">Crypto</Label>
                        <Input type="number" placeholder="0 €" className="bg-zinc-900 border-zinc-800 mt-1" value={crypto} onChange={(e) => setCrypto(e.target.value)} />
                    </div>
                    <div>
                        <Label className="text-xs text-zinc-400">Immobilier (Net)</Label>
                        <Input type="number" placeholder="0 €" className="bg-zinc-900 border-zinc-800 mt-1" value={immo} onChange={(e) => setImmo(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleFinish} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                        Terminer & Accéder au Dashboard <CheckCircle2 className="ml-2 h-4 w-4" />
                    </Button>
                </DialogFooter>
            </>
        )}

      </DialogContent>
    </Dialog>
  );
}