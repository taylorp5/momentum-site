import { subDays } from "date-fns";

/** Enough calendar history to resolve long streaks without huge queries. */
export const ACTIVITY_STREAK_LOOKBACK_DAYS = 400;

function parseYmdAsUtcNoon(ymd: string): Date {
  const s = ymd.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return new Date(NaN);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
}

/** Civil YYYY-MM-DD minus N days (DST-safe via noon UTC anchor). */
export function subtractCalendarDays(ymd: string, days: number): string {
  return subDays(parseYmdAsUtcNoon(ymd), days).toISOString().slice(0, 10);
}

function ymdFromIntlParts(parts: Intl.DateTimeFormatPart[]): string {
  const y = parts.find((p) => p.type === "year")?.value;
  const mo = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !mo || !d) return "";
  return `${y}-${mo}-${d}`;
}

export function safeTimeZone(tz: string | null | undefined): string {
  const t = (tz ?? "UTC").trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: t }).format(new Date());
    return t;
  } catch {
    return "UTC";
  }
}

export function resolveRequestTimeZone(headers: Headers): string {
  const raw =
    headers.get("x-vercel-ip-timezone") ?? headers.get("X-Vercel-IP-Timezone");
  return safeTimeZone(raw);
}

/** Today's calendar date as YYYY-MM-DD in the given IANA zone. */
export function calendarTodayYmdInTimeZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const ymd = ymdFromIntlParts(parts);
  if (ymd) return ymd;
  return new Date().toISOString().slice(0, 10);
}

/** Map an ISO instant to the user's calendar YYYY-MM-DD in `timeZone`. */
export function utcInstantToCalendarYmd(isoUtc: string, timeZone: string): string {
  const t = Date.parse(isoUtc);
  if (!Number.isFinite(t)) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(t));
  return ymdFromIntlParts(parts);
}

export type ActivityStreakResult =
  | { status: "active"; days: number }
  | { status: "paused"; days: number }
  | { status: "broken" };

/**
 * Consecutive calendar days with activity, evaluated in the timezone that produced `todayYmd`.
 * - Active: today has activity; count includes today backward.
 * - Paused: no activity today, but yesterday does; count ends at yesterday.
 * - Broken: neither today nor yesterday has activity.
 */
export function computeActivityStreak(
  activeDates: Iterable<string>,
  todayYmd: string
): ActivityStreakResult {
  const active = new Set<string>();
  for (const raw of activeDates) {
    const s = raw.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) active.add(s);
  }
  const yesterdayYmd = subtractCalendarDays(todayYmd, 1);

  const countBackFrom = (start: string): number => {
    let n = 0;
    let d = start;
    while (active.has(d)) {
      n += 1;
      d = subtractCalendarDays(d, 1);
    }
    return n;
  };

  if (active.has(todayYmd)) {
    return { status: "active", days: countBackFrom(todayYmd) };
  }
  if (active.has(yesterdayYmd)) {
    return { status: "paused", days: countBackFrom(yesterdayYmd) };
  }
  return { status: "broken" };
}
