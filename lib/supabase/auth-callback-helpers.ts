/** Base64url JWT payload segment → JSON (works in browser and Node). */
function decodeJwtPayload(token: string): { amr?: unknown } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    let base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 ? 4 - (base64.length % 4) : 0;
    base64 += "=".repeat(pad);
    const json = atob(base64);
    return JSON.parse(json) as { amr?: unknown };
  } catch {
    return null;
  }
}

/** Password recovery sessions often include `amr` containing `recovery` (OAuth uses other values). */
export function isPasswordRecoveryAccessToken(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return false;
  const amr = payload.amr;
  if (Array.isArray(amr)) {
    return amr.some((x) => x === "recovery");
  }
  if (typeof amr === "string") {
    return amr === "recovery";
  }
  return false;
}
