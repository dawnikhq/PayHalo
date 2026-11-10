import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase auth, server side. The anon key is public by design; the service
 * key never appears in this file — data access goes through PostgREST with the
 * service key only inside the storage driver.
 */
export function supabaseConfigured(): boolean {
  return Boolean((process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim() && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim());
}

export async function supabaseServer() {
  if (!supabaseConfigured()) return null;
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          /* called from a Server Component: the middleware already refreshed the session */
        }
      },
    },
  });
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

function displayName(email: string, meta: Record<string, unknown> | undefined): string {
  const fromMeta = typeof meta?.name === "string" ? meta.name.trim() : "";
  if (fromMeta) return fromMeta;
  const local = email.split("@")[0] ?? "";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export async function currentUser(): Promise<SessionUser | null> {
  const client = await supabaseServer();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  const email = data.user.email ?? "";
  return {
    id: data.user.id,
    email,
    name: displayName(email, data.user.user_metadata as Record<string, unknown> | undefined),
  };
}
