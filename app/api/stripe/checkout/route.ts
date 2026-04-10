import { NextResponse } from "next/server";
import Stripe from "stripe";
import { authenticateRequest } from "@/lib/authGuard";

// Initialisation Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore : Correction du problème apiVersion
  apiVersion: "2023-10-16", 
});

export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  // Vérification de l'authentification côté serveur
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  try {
    const { email } = await req.json();

    // Vérification des données — on utilise l'ID de l'utilisateur authentifié, PAS celui du body
    if (!email) {
        return NextResponse.json({ error: "Email manquant" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: "price_1T1r4ZPqbFP5dfks28pR6D8u", 
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/tarifs`,
      customer_email: email,
      metadata: {
        userId: auth.user.id, // ✅ Utilise l'ID authentifié côté serveur
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

