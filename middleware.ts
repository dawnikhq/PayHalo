import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Two jobs:
 *
 *  1. Turn `?share=<token>` into an httpOnly cookie, so a keyholder or
 *     beneficiary link keeps working as they move around their portal, and
 *     then strip the token out of the address bar.
 *  2. Keep the owner's session fresh and send signed-out visitors to /signin.
 *
 * The share token is *not* verified here — the edge runtime has no business
 * checking HMACs. It is verified on every server read, which is where it
 * matters.
 */

const SHARE_COOKIE = "vivo_share";

const OWNER_PATHS = [
  "/dashboard",
  "/assets",
  "/beneficiaries",
  "/plan",
  "/documents",
  "/activity",
  "/settings",
  "/help",
  "/onboarding",
];

const OWNER_APIS = ["/api/paypal", "/api/assets", "/api/beneficiaries", "/api/documents", "/api/profile", "/api/plan", "/api/onboarding"];

function isOwnerRoute(pathname: string) {
  if (OWNER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (OWNER_APIS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const share = url.searchParams.get("share");

  const response = NextResponse.next({ request });

  if (share) {
    response.cookies.set(SHARE_COOKIE, share, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    url.searchParams.delete("share");
    const clean = NextResponse.redirect(url);
    clean.cookies.set(SHARE_COOKIE, share, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return clean;
  }

  if (!isOwnerRoute(url.pathname)) return response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!supabaseUrl || !anon) {
    /* Auth is not configured: send people to the sign-in screen, which explains it. */
    if (url.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Accounts are not configured on this deployment." }, { status: 503 });
    }
    return NextResponse.redirect(new URL("/signin?unconfigured=1", url));
  }

  const client = createServerClient(supabaseUrl, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    if (url.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    }
    const next = url.pathname + (url.search ? url.search : "");
    const to = new URL("/signin", url);
    to.searchParams.set("next", next);
    return NextResponse.redirect(to);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|documents/).*)"],
};
