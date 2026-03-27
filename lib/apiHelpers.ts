import { supabase } from "./supabaseClient";

/**
 * Retourne les headers d'authentification pour les appels API internes.
 * Usage: const headers = await getAuthHeaders();
 *        fetch("/api/...", { headers: { ...headers, "Content-Type": "application/json" } });
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}
