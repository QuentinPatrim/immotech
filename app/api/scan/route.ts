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
      return NextResponse.json({ error: "Aucune image fournie." }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Tu es un expert comptable de haut niveau. 
          L'utilisateur va t'envoyer une image d'un ticket de caisse ou d'un relevé bancaire.
          Ta mission : extraire les dépenses.
          Règle 1 : Renvoie UNIQUEMENT un tableau JSON pur. Pas de texte avant, pas de texte après.
          Règle 2 : Le format doit être exactement : { "expenses": [ { "name": "Nom du commerce (court)", "amount": 12.50, "category": "BESOIN" ou "ENVIE" } ] }
          Règle 3 : Utilise la catégorie "BESOIN" pour l'alimentaire, logement, santé, transport, factures. Utilise "ENVIE" pour les restaurants, loisirs, vêtements, jeux.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyse cette image et extrais les dépenses au format JSON demandé." },
            { type: "image_url", image_url: { url: imageBase64 } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const resultText = response.choices[0].message.content;
    const parsedResult = JSON.parse(resultText || '{"expenses": []}');
    
    return NextResponse.json(parsedResult);

  } catch (error) {
    console.error("Erreur Scanner IA:", (error as Error).message);
    return NextResponse.json({ error: "Erreur lors de l'analyse du document." }, { status: 500 });
  }
}