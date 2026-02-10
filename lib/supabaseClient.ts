import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// C'est cet objet "supabase" qu'on utilisera partout pour sauvegarder/charger
export const supabase = createClient(supabaseUrl, supabaseKey);