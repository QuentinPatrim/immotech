import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialise Stripe avec ta clé secrète (à mettre dans ton fichier .env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

export async function POST(req: Request) {
  try {
    const { email, packType } = await req.json();

    // Associe les packs aux IDs de prix que tu as copiés sur Stripe
    let priceId = "";
    if (packType === "token_1") priceId = "price_1TRAiGPqbFP5dfksyVwfDeIv";
    else if (packType === "tokens_5") priceId = "price_1TRAisPqbFP5dfksnnEcjIm1";
    else if (packType === "tokens_100") priceId = "price_1TRAjbPqbFP5dfksQCdcyGV7";
    else return NextResponse.json({ error: "Pack invalide" }, { status: 400 });

    // Création de la session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment", // "payment" car c'est un achat unique, pas "subscription"
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/parametres?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/parametres?canceled=true`,
      // IMPORTANT : On passe le packType et l'email dans les métadonnées pour le webhook
      metadata: {
        email: email,
        packType: packType,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erreur Stripe :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}