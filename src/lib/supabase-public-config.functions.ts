import { createServerFn } from "@tanstack/react-start";

export const getPublicSupabaseConfig = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    const missing = [
      ...(!url ? ["SUPABASE_URL"] : []),
      ...(!key ? ["SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY"] : []),
    ];
    throw new Error(`Missing public backend config: ${missing.join(", ")}`);
  }

  return { url, key };
});