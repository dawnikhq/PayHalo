"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client. Uses the publishable anon key only — it can create sessions,
 * never read another household's plan.
 */
export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}
