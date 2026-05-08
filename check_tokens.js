const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
async function main() {
  const { data, error } = await supabase.from('profiles').select('id, email, tokens');
  console.log("Data:", data);
  if (error) console.log("Error:", error);
}
main();
