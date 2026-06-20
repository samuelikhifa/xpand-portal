import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getPublicSupabaseConfig } from "@/lib/supabase-public-config.functions";

let clientPromise: Promise<ReturnType<typeof createClient<Database>>> | null = null;

export function getRuntimeSupabaseClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { url, key } = await getPublicSupabaseConfig();

      return createClient<Database>(url, key, {
        auth: {
          storage: typeof window !== "undefined" ? window.localStorage : undefined,
          persistSession: true,
          autoRefreshToken: true,
        },
        global: {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
        },
      });
    })();
  }

  return clientPromise;
}