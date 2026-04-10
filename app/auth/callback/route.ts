import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isPasswordRecoveryAccessToken } from "@/lib/supabase/auth-callback-helpers";

/** Only allow same-origin relative paths (avoid open redirects). */
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  if (raw.includes("://") || raw.includes("\\")) {
    return "/dashboard";
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const u = new URL(request.url);
    u.pathname = "/login";
    u.search = "?error=config";
    return NextResponse.redirect(u);
  }

  if (!code) {
    const errUrl = new URL(request.url);
    errUrl.pathname = "/login";
    errUrl.search = "?error=auth";
    return NextResponse.redirect(errUrl);
  }

  const isLocalhost = requestUrl.hostname === "localhost";
  const protocol = isLocalhost ? "http:" : "https:";
  const host = request.headers.get("x-forwarded-host") ?? requestUrl.host;

  const pending: { name: string; value: string; options?: Parameters<typeof NextResponse.prototype.cookies.set>[2] }[] =
    [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pending.push(...cookiesToSet);
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errUrl = new URL(request.url);
    errUrl.pathname = "/login";
    errUrl.search = "?error=auth";
    return NextResponse.redirect(errUrl);
  }

  let path = safeNextPath(requestUrl.searchParams.get("next"));
  const { data: { session } } = await supabase.auth.getSession();
  if (isPasswordRecoveryAccessToken(session?.access_token)) {
    path = "/reset-password";
  }

  const dest = new URL(`${protocol}//${host}${path}`);
  const response = NextResponse.redirect(dest);
  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, options);
  }
  return response;
}
