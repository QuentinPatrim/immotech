import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialisation Stripe avec correction du type pour apiVersion
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore : Empêche l'erreur de type si la version installée est plus récente
  apiVersion: "2023-10-16", 
});

export async function POST(req: Request) {
  try {
    const { email, userId } = await req.json();

    // Vérification des données
    if (!email || !userId) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          // REMPLACEZ BIEN CECI PAR VOTRE ID DE PRIX RÉEL (ex: price_1P...)
          price: "price_1T1r4ZPqbFP5dfks28pR6D8", 
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/tarifs`,
      customer_email: email,
      metadata: {
        userId: userId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}