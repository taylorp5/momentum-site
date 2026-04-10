import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

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
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const u = new URL(request.url);
    u.pathname = "/login";
    u.search = "?error=config";
    return NextResponse.redirect(u);
  }

  if (code) {
    const isLocalhost = requestUrl.hostname === "localhost";
    const protocol = isLocalhost ? "http:" : "https:";
    const host = request.headers.get("x-forwarded-host") ?? requestUrl.host;
    const dest = new URL(`${protocol}//${host}${next}`);

    const response = NextResponse.redirect(dest);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  const errUrl = new URL(request.url);
  errUrl.pathname = "/login";
  errUrl.search = "?error=auth";
  return NextResponse.redirect(errUrl);
}
