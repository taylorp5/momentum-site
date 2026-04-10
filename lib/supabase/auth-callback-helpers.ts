/** Base64url JWT payload segment → JSON (works in browser and Node). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    let base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 ? 4 - (base64.length % 4) : 0;
    base64 += "=".repeat(pad);
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function amrEntryIsRecovery(entry: unknown): boolean {
  if (entry === "recovery") return true;
  if (entry && typeof entry === "object" && "method" in entry) {
    const m = (entry as { method?: unknown }).method;
    return m === "recovery";
  }
  return false;
}

/** Password recovery JWTs usually include `amr` with method `recovery` (often as objects, not plain strings). */
export function isPasswordRecoveryAccessToken(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return false;
  const amr = payload.amr;
  if (Array.isArray(amr)) {
    return amr.some(amrEntryIsRecovery);
  }
  if (typeof amr === "string") {
    return amr === "recovery";
  }
  return amrEntryIsRecovery(amr);
}
