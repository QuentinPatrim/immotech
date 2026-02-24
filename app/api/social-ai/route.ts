import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { topic, theme, context, pdfSource } = await req.json();

    let sourceMaterial = "Sujet libre : Utilise ton expertise financière académique.";
    if (pdfSource) sourceMaterial = `ANALYSE DE CE DOCUMENT (PRIORITÉ ABSOLUE) : "${pdfSource.substring(0, 25000)}"`;
    else if (context) sourceMaterial = `CONTEXTE IMPÉRATIF : "${context}"`;

    const systemPrompt = `Tu es un Expert Financier de renommée mondiale (type Professeur à HEC ou Analyste Senior).
    Ton objectif : Créer une fiche de synthèse technique et éducative sur : "${topic}".
    
    SOURCE : 
    ${sourceMaterial}
    
    CONSIGNES STRICTES :
    1. DENSITÉ MAXIMALE : Ne sois pas superficiel. Le lecteur doit apprendre des mécanismes précis.
    2. VOCABULAIRE EXPERT : Utilise les bons termes (ex: "rendement réel net d'inflation" plutôt que "gains").
    3. NE VENDS RIEN : Tu n'es pas là pour faire de la pub pour Nexus, mais pour éduquer.
    4. STRUCTURE : Remplis les champs avec des paragraphes complets, pas juste des phrases courtes.

    Renvoie UNIQUEMENT un JSON strict :
    {
      "linkedin_post": "Post LinkedIn expert (Accroche narrative, Développement technique en 3 points, Conclusion).",
      "visual": {
        "header_title": "TITRE DU SUJET",
        "header_tag": "THÈME (ex: MACRO-ÉCONOMIE)",
        
        "kpi_1_value": "XX", "kpi_1_label": "Label court",
        "kpi_2_value": "XX", "kpi_2_label": "Label court",
        "kpi_3_value": "XX", "kpi_3_label": "Label court",

        "intro_title": "ANALYSE FONDAMENTALE",
        "intro_text": "Paragraphe dense (5-6 lignes) expliquant le concept, son origine légale ou économique, et sa fonction première.",
        
        "analysis_title": "MÉCANISMES CLÉS",
        "analysis_points": [
            "Point 1 : Explication détaillée (2 phrases)",
            "Point 2 : Explication détaillée (2 phrases)",
            "Point 3 : Explication détaillée (2 phrases)"
        ],
        
        "example_title": "ÉTUDE DE CAS",
        "example_text": "Un exemple chiffré précis ou une comparaison historique.",
        
        "show_chart": true,
        "chart_title": "ÉVOLUTION (Base 100)",
        "chart_data": [
            {"name": "Début", "value1": 100, "value2": 100}, 
            {"name": "Milieu", "value1": 110, "value2": 105}, 
            {"name": "Fin", "value1": 150, "value2": 110}
        ],
        "chart_legend": ["Sujet Principal", "Benchmark"],
        
        "footer_conclusion": "Une conclusion stratégique objective."
      }
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Traite ce sujet : ${topic}` }
      ],
      response_format: { type: "json_object" }
    });

    return NextResponse.json(JSON.parse(response.choices[0].message.content || "{}"));

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur IA" }, { status: 500 });
  }
}