import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { accountById, sessionAccount } from "./accounts";
import { readSessionToken } from "./session";

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

/**
 * The signed-in owner, from PayHalo's own session cookie.
 *
 * Supabase stores the data; it is not the identity provider. The Supabase Auth
 * path below is kept dormant (VIVO_AUTH=supabase) in case it is ever wanted
 * back, but the product's sign-in is `/signin` → `vivo_users` + `vivo_sessions`.
 */
export async function currentUser(): Promise<SessionUser | null> {
  if (process.env.VIVO_AUTH?.trim() === "supabase") return supabaseUser();

  const token = await readSessionToken();
  if (!token) return null;

  const account = await sessionAccount(token);
  if (!account) return null;

  const fresh = account.name ? account : await accountById(account.id);
  return {
    id: account.id,
    email: account.email,
    name: fresh?.name?.trim() || displayName(account.email, undefined),
  };
}

export async function supabaseUser(): Promise<SessionUser | null> {
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
