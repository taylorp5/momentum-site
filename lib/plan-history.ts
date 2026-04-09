/** Inclusive rolling window from today (UTC) for free-tier distribution & analytics. */
export const FREE_HISTORY_DAY_SPAN = 30;

export function utcTodayIsoDate(): string {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return d.toISOString().slice(0, 10);
}

/** UTC calendar day `days` ago through today, inclusive (e.g. 7 → last 7 days). */
export function isoDateDaysAgoInclusive(days: number): string {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

export function freeHistoryDateFromInclusive(): string {
  return isoDateDaysAgoInclusive(FREE_HISTORY_DAY_SPAN);
}

function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}

function minIso(a: string, b: string): string {
  return a <= b ? a : b;
}

/**
 * Free: always bound list queries to the last {@link FREE_HISTORY_DAY_SPAN} days (UTC).
 * Pro: pass filters through unchanged.
 */
export function clampDistributionQueryForPlan(
  isPro: boolean,
  q: { dateFrom?: string; dateTo?: string }
): { dateFrom?: string; dateTo?: string } {
  if (isPro) {
    return { dateFrom: q.dateFrom, dateTo: q.dateTo };
  }

  const floor = freeHistoryDateFromInclusive();
  const today = utcTodayIsoDate();

  if (!q.dateFrom && !q.dateTo) {
    return { dateFrom: floor, dateTo: undefined };
  }

  const dateFrom = q.dateFrom ? maxIso(q.dateFrom, floor) : floor;
  let dateTo = q.dateTo ? minIso(q.dateTo, today) : undefined;
  if (dateTo && dateFrom > dateTo) {
    dateTo = dateFrom;
  }

  return { dateFrom, dateTo: dateTo };
}

export function clampIsoRangeToFreeHistory(
  dateFrom?: string,
  dateTo?: string
): { dateFrom: string; dateTo?: string } {
  const floor = freeHistoryDateFromInclusive();
  const today = utcTodayIsoDate();
  const from = dateFrom ? maxIso(dateFrom, floor) : floor;
  let to = dateTo ? minIso(dateTo, today) : undefined;
  if (to && from > to) {
    to = from;
  }
  return { dateFrom: from, dateTo: to };
}
