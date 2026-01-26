"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, AlertTriangle, CheckCircle2, TrendingUp, ShieldAlert, Target, Microscope, ArrowRight, Loader2, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// --- TYPES ---
type AnalysisReport = {
  score: number;
  summary: string;
  budgetAnalysis: { status: "good" | "warning" | "bad"; text: string; detail: string };
  assetAnalysis: { status: "good" | "warning" | "bad"; text: string; detail: string };
  riskAnalysis: { level: "Faible" | "Modéré" | "Élevé"; text: string };
  actionPlan: string[];
};

export default function AnalysesPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [dataExists, setDataExists] = useState(false);

  // Vérification de la présence de données au chargement
  useEffect(() => {
    const assets = localStorage.getItem("myAssets");
    const budget = localStorage.getItem("myBudget");
    if (assets || budget) setDataExists(true);
  }, []);

  // --- MOTEUR D'ANALYSE (LOGIQUE EXPERTE) ---
  const runAnalysis = () => {
    setIsAnalyzing(true);
    setReport(null);

    // Simulation du temps de calcul de l'IA (2.5 secondes)
    setTimeout(() => {
        try {
            // 1. RÉCUPÉRATION DES DONNÉES BRUTES
            const assetsData = JSON.parse(localStorage.getItem("myAssets") || "[]");
            const budgetData = JSON.parse(localStorage.getItem("myBudget") || "{}");
            const dcaData = JSON.parse(localStorage.getItem("dcaStrategy") || "{}");

            // Calculs Budget
            const income = budgetData.income || 0;
            const expensesList = budgetData.expenses || [];
            const totalExpenses = expensesList.reduce((acc: number, item: any) => acc + item.amount, 0);
            const savings = Math.max(0, income - totalExpenses);
            const savingsRate = income > 0 ? (savings / income) * 100 : 0;

            // Calculs Patrimoine
            const totalAssets = assetsData.reduce((acc: number, item: any) => acc + item.value, 0);
            const cryptoAssets = assetsData.filter((a: any) => a.type === "Crypto").reduce((acc: number, item: any) => acc + item.value, 0);
            const cashAssets = assetsData.filter((a: any) => a.type === "Cash").reduce((acc: number, item: any) => acc + item.value, 0);
            
            // Ratios
            const cryptoShare = totalAssets > 0 ? (cryptoAssets / totalAssets) * 100 : 0;
            const emergencyFundMonths = expensesList.length > 0 && totalExpenses > 0 ? cashAssets / totalExpenses : 0;

            // --- GÉNÉRATION DU RAPPORT ---
            let calculatedScore = 100;
            let actions = [];
            
            // 1. ANALYSE BUDGETAIRE
            let budgetStatus: "good" | "warning" | "bad" = "good";
            let budgetText = "Votre gestion budgétaire est exemplaire.";
            let budgetDetail = `Taux d'épargne actuel : ${savingsRate.toFixed(0)}%. C'est excellent pour construire votre avenir.`;

            if (savingsRate < 5) {
                budgetStatus = "bad";
                calculatedScore -= 30;
                budgetText = "Situation budgétaire critique.";
                budgetDetail = "Vous vivez flux tendu. Votre capacité d'investissement est quasi nulle.";
                actions.push("Réduire drastiquement les dépenses variables (Restos, Abos).");
            } else if (savingsRate < 20) {
                budgetStatus = "warning";
                calculatedScore -= 15;
                budgetText = "Capacité d'épargne insuffisante.";
                budgetDetail = `Vous n'épargnez que ${savingsRate.toFixed(0)}%. La recommandation saine est de viser 20% minimum.`;
                actions.push("Revoir les charges fixes (Assurances, Forfaits) pour libérer du cash.");
            }

            // 2. ANALYSE PATRIMONIALE & RISQUES
            let assetStatus: "good" | "warning" | "bad" = "good";
            let assetText = "Allocation d'actifs équilibrée.";
            let assetDetail = "Vous avez une bonne diversification.";
            let riskLevel: "Faible" | "Modéré" | "Élevé" = "Modéré";
            let riskText = "Votre exposition au risque est maîtrisée.";

            if (totalAssets === 0) {
                assetStatus = "bad";
                assetText = "Aucun patrimoine détecté.";
                assetDetail = "Commencez par construire une épargne de précaution.";
                actions.push("Ouvrir un Livret A et y placer 1 mois de salaire.");
                calculatedScore = 50;
            } else {
                // Check Sécurité (Matelas)
                if (emergencyFundMonths < 3) {
                    assetStatus = "warning";
                    calculatedScore -= 10;
                    assetDetail = `Attention, votre épargne de précaution est faible (${emergencyFundMonths.toFixed(1)} mois de dépenses).`;
                    actions.push("Sécuriser 3 à 6 mois de dépenses sur un support liquide (Livret).");
                }

                // Check Crypto
                if (cryptoShare > 40) {
                    riskLevel = "Élevé";
                    calculatedScore -= 15;
                    riskText = "Exposition critique aux actifs volatils.";
                    actions.push("Rééquilibrer le portefeuille : Vendre une partie des cryptos pour renforcer les actions ou le cash.");
                } else if (cryptoShare === 0 && dcaData.crypto === 0) {
                    riskLevel = "Faible";
                    riskText = "Profil très défensif. Risque de sous-performance face à l'inflation.";
                    actions.push("Envisager une petite exposition (5%) aux actifs dynamiques (Bitcoin ou ETF Tech).");
                }
            }

            // SCORE FINAL & RÉSUMÉ
            const summary = calculatedScore > 80 
                ? "Votre santé financière est robuste. Vous êtes prêt pour l'accélération patrimoniale." 
                : calculatedScore > 50 
                ? "Des fondations existent mais des ajustements structurels sont nécessaires pour débloquer votre potentiel."
                : "Attention : Votre structure actuelle met votre avenir financier à risque. Action immédiate requise.";

            setReport({
                score: calculatedScore,
                summary,
                budgetAnalysis: { status: budgetStatus, text: budgetText, detail: budgetDetail },
                assetAnalysis: { status: assetStatus, text: assetText, detail: assetDetail },
                riskAnalysis: { level: riskLevel, text: riskText },
                actionPlan: actions.length > 0 ? actions : ["Continuer la stratégie DCA actuelle.", "Monitorer les marchés."]
            });

        } catch (e) {
            console.error("Erreur analyse", e);
        } finally {
            setIsAnalyzing(false);
        }
    }, 2500);
  };

  return (
    <div className="flex flex-col md:flex-row bg-black">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto space-y-8"
        >
          {/* HEADER */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                    <Brain className="text-emerald-500" /> ImmoTech AI<span className="text-xs bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded ml-2">BÊTA</span>
                </h1>
                <p className="text-zinc-400 max-w-2xl">
                    Notre algorithme croise vos données budgétaires et patrimoniales pour générer un audit objectif et sans concession.
                </p>
            </div>
          </header>

          {/* ZONE DE LANCEMENT (Si pas de rapport) */}
          {!report && !isAnalyzing && (
              <div className="min-h-[400px] flex flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/20 p-8 text-center space-y-6">
                  <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                      <Microscope size={40} className="text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-white">Prêt pour l'audit ?</h2>
                      <p className="text-zinc-400 max-w-md mx-auto">
                        L'IA va analyser votre taux d'épargne, votre diversification et votre exposition aux risques.
                      </p>
                  </div>
                  
                  {dataExists ? (
                      <Button onClick={runAnalysis} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-6 text-lg rounded-full shadow-lg shadow-emerald-900/20 transition-all hover:scale-105">
                          <Brain className="mr-2 h-5 w-5" /> Lancer l'Analyse Complète
                      </Button>
                  ) : (
                      <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-lg text-red-200 text-sm flex items-center gap-2">
                          <AlertTriangle size={16}/> Données insuffisantes. Remplissez d'abord votre Budget et votre Patrimoine.
                      </div>
                  )}
              </div>
          )}

          {/* ANIMATION DE CHARGEMENT */}
          {isAnalyzing && (
              <div className="min-h-[400px] flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                      <div className="w-24 h-24 border-4 border-emerald-900/30 border-t-emerald-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                          <Brain className="text-emerald-500 animate-pulse" size={32} />
                      </div>
                  </div>
                  <div className="space-y-1 text-center">
                      <p className="text-lg font-bold text-white">Analyse en cours...</p>
                      <p className="text-sm text-zinc-500">Calcul des ratios de liquidité • Évaluation des risques • Optimisation fiscale</p>
                  </div>
              </div>
          )}

          {/* RAPPORT GÉNÉRÉ */}
          {report && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                  {/* 1. SCORE GLOBAL */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="md:col-span-2 border-zinc-800 bg-gradient-to-br from-zinc-900 to-black">
                          <CardHeader>
                              <CardTitle className="text-zinc-400 text-sm uppercase tracking-widest flex items-center gap-2">
                                  Synthèse Globale
                              </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                              <p className="text-lg md:text-xl text-white leading-relaxed font-medium">
                                  "{report.summary}"
                              </p>
                              <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Données auditées: 100%</Badge>
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Date: {new Date().toLocaleDateString()}</Badge>
                              </div>
                          </CardContent>
                      </Card>

                      <Card className="border-zinc-800 bg-zinc-900/30 flex flex-col items-center justify-center text-center p-6">
                          <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                              <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="64" cy="64" r="60" stroke="#27272a" strokeWidth="8" fill="none" />
                                  <circle cx="64" cy="64" r="60" stroke={report.score > 70 ? "#10b981" : report.score > 40 ? "#f59e0b" : "#ef4444"} strokeWidth="8" fill="none" strokeDasharray={2 * Math.PI * 60} strokeDashoffset={2 * Math.PI * 60 * (1 - report.score / 100)} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <span className="text-4xl font-black text-white">{report.score}</span>
                                  <span className="text-xs text-zinc-500 uppercase">Score / 100</span>
                              </div>
                          </div>
                      </Card>
                  </div>

                  {/* 2. DÉTAILS PAR THÈME */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Budget */}
                      <Card className="border-zinc-800 bg-zinc-900/30">
                          <CardHeader className="flex flex-row items-center gap-3 pb-2">
                              <div className={`p-2 rounded-lg ${report.budgetAnalysis.status === 'good' ? 'bg-emerald-500/10 text-emerald-500' : report.budgetAnalysis.status === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                                  <Target size={20} />
                              </div>
                              <CardTitle className="text-base text-white">Flux & Budget</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                              <h4 className={`font-bold ${report.budgetAnalysis.status === 'good' ? 'text-emerald-400' : report.budgetAnalysis.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
                                  {report.budgetAnalysis.text}
                              </h4>
                              <p className="text-sm text-zinc-400 leading-relaxed">
                                  {report.budgetAnalysis.detail}
                              </p>
                          </CardContent>
                      </Card>

                      {/* Patrimoine & Risque */}
                      <Card className="border-zinc-800 bg-zinc-900/30">
                          <CardHeader className="flex flex-row items-center gap-3 pb-2">
                              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                  <ShieldAlert size={20} />
                              </div>
                              <CardTitle className="text-base text-white">Structure & Risques</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                              <div>
                                  <h4 className="font-bold text-white mb-1">Allocation d'actifs</h4>
                                  <p className="text-sm text-zinc-400">{report.assetAnalysis.detail}</p>
                              </div>
                              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex justify-between items-center">
                                  <span className="text-sm text-zinc-400">Niveau de Risque Détecté</span>
                                  <Badge className={`${report.riskAnalysis.level === 'Faible' ? 'bg-blue-500' : report.riskAnalysis.level === 'Modéré' ? 'bg-amber-500' : 'bg-red-500'} hover:none`}>
                                      {report.riskAnalysis.level}
                                  </Badge>
                              </div>
                              <p className="text-xs text-zinc-500 italic">"{report.riskAnalysis.text}"</p>
                          </CardContent>
                      </Card>
                  </div>

                  {/* 3. PLAN D'ACTION */}
                  <Card className="border-emerald-500/30 bg-emerald-900/10">
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-white">
                              <TrendingUp className="text-emerald-500" /> Plan d'Action Recommandé
                          </CardTitle>
                          <CardDescription className="text-zinc-400">Étapes concrètes pour améliorer votre score.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <ul className="space-y-3">
                              {report.actionPlan.map((action, i) => (
                                  <li key={i} className="flex gap-3 items-start">
                                      <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={18} />
                                      <span className="text-zinc-200 text-sm">{action}</span>
                                  </li>
                              ))}
                          </ul>
                      </CardContent>
                  </Card>

                  <div className="flex justify-center pt-4">
                      <Button variant="ghost" onClick={runAnalysis} className="text-zinc-500 hover:text-white gap-2">
                          <RefreshCcw size={16} /> Relancer une analyse
                      </Button>
                  </div>

              </motion.div>
          )}

        </motion.div>
      </main>
    </div>
  );
}