import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Vérifie l'authentification d'une requête API via le header Authorization.
 * Usage dans une route API :
 *   const auth = await authenticateRequest(req);
 *   if (auth.error) return auth.error;
 *   const user = auth.user;
 */
export async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      user: null as null,
      error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }),
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null as null,
      error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }),
    };
  }

  return { user, error: null };
}
