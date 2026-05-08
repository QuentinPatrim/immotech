import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!,);

// On utilise la clé "Service Role" de Supabase pour bypasser les sécurités et forcer l'ajout des jetons
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error: any) {
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  // Si le paiement est un succès
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const email = session.metadata?.email;
    const userId = session.metadata?.userId;
    const packType = session.metadata?.packType;

    if (packType && (userId || email)) {
      // 1. Déterminer combien de jetons ajouter
      let tokensToAdd = 0;
      if (packType === "token_1") tokensToAdd = 1;
      if (packType === "tokens_5") tokensToAdd = 5;
      if (packType === "tokens_100") tokensToAdd = 100;

      // 2. Récupérer l'utilisateur dans Supabase
      let targetUserId = userId;
      let currentTokens = 0;

      if (userId) {
        const { data: userProps } = await supabaseAdmin.from('profiles').select('id, tokens').eq('id', userId).single();
        if (userProps) {
          currentTokens = userProps.tokens || 0;
        }
      } else if (email) {
        // Fallback for old checkout sessions
        const { data: userProps } = await supabaseAdmin.from('profiles').select('id, tokens').eq('email', email).single();
        if (userProps) {
          currentTokens = userProps.tokens || 0;
          targetUserId = userProps.id;
        }
      }

      if (targetUserId) {
        // 3. Ajouter les nouveaux jetons
        await supabaseAdmin
          .from('profiles')
          .update({ tokens: currentTokens + tokensToAdd })
          .eq('id', targetUserId);
          
        console.log(`Ajouté ${tokensToAdd} jetons à ${targetUserId}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}