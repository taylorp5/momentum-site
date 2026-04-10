/** Password recovery PKCE sessions often include `amr` containing `recovery` (OAuth uses other values). */
export function isPasswordRecoveryAccessToken(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  try {
    const part = accessToken.split(".")[1];
    if (!part) return false;
    const json = Buffer.from(part, "base64url").toString("utf8");
    const payload = JSON.parse(json) as { amr?: unknown };
    const amr = payload.amr;
    if (Array.isArray(amr)) {
      return amr.some((x) => x === "recovery");
    }
    if (typeof amr === "string") {
      return amr === "recovery";
    }
    return false;
  } catch {
    return false;
  }
}
