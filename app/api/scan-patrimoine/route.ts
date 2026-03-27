import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { authenticateRequest } from '@/lib/authGuard';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Image manquante." }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu es un expert financier. L'utilisateur t'envoie un relevé de compte ou de portefeuille d'investissement (souvent multi-pages).
          
          Ta mission est d'extraire CHAQUE ligne d'investissement que tu trouves (ex: chaque action, ETF, ou ligne de compte).
          
          Tu DOIS répondre avec un objet JSON ayant la structure exacte suivante :
          {
            "assets": [
              {
                "name": "Nom du titre ou compte (ex: AIS-Amundi S&P 500, Genfit S.A, Compte Courant...)",
                "value": montant_total_en_euros (ex: 4614.64),
                "type": "Bourse" | "Cash" | "Crypto" | "AssuranceVie" | "Immobilier" | "Autre",
                "quantity": nombre_de_titres (ex: 41.573289 - OPTIONNEL),
                "unitPrice": cours_par_titre (ex: 111.00 - OPTIONNEL)
              }
            ]
          }
          
          Règles strictes :
          - Détaille bien chaque ligne de titre (Ne fais pas qu'un seul gros bloc "Trade Republic").
          - "value", "quantity" et "unitPrice" doivent être des NOMBRES purs (utilise le point pour les décimales, enlève les symboles € et les espaces).
          - Si la ligne concerne des actions, ETF ou obligations, le "type" est "Bourse".
          - S'il y a du solde en espèces, crée une ligne "Espèces" de type "Cash".`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extrais toutes les positions financières détaillées de ce document." },
            { type: "image_url", image_url: { url: imageBase64 } }
          ]
        }
      ]
    });

    const content = response.choices[0].message.content;
    const parsedData = JSON.parse(content || '{"assets": []}');
    
    return NextResponse.json(parsedData);

  } catch (error) {
    console.error("Erreur serveur lors du scan AI:", (error as Error).message);
    return NextResponse.json({ error: "Erreur lors de l'analyse." }, { status: 500 });
  }
}