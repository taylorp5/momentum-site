import {
  addMonths,
  addYears,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";

export type CostBillingType = "one_time" | "monthly" | "yearly";

export type CostProjectionInput = {
  amount: number;
  entry_date: string;
  billing_type?: CostBillingType | string | null;
  recurring_start_date?: string | null;
  recurring_end_date?: string | null;
  recurring_active?: boolean | null;
  is_recurring?: boolean | null;
};

function parseDay(iso: string): Date | null {
  const d = startOfDay(parseISO(iso.slice(0, 10)));
  return isValid(d) ? d : null;
}

export function normalizeBillingType(row: CostProjectionInput): CostBillingType {
  const t = row.billing_type;
  if (t === "monthly" || t === "yearly" || t === "one_time") return t;
  if (row.is_recurring) return "monthly";
  return "one_time";
}

function subscriptionAnchor(row: CostProjectionInput): Date | null {
  const raw =
    row.recurring_start_date?.trim().slice(0, 10) ||
    row.entry_date?.trim().slice(0, 10);
  return raw ? parseDay(raw) : null;
}

function subscriptionEnd(row: CostProjectionInput): Date | null {
  const e = row.recurring_end_date?.trim();
  return e ? parseDay(e) : null;
}

function countAnchorChargesInRange(
  anchor: Date,
  frequency: "monthly" | "yearly",
  subEnd: Date | null,
  rangeStart: Date,
  rangeEnd: Date
): number {
  const capEnd = subEnd ?? parseDay("9999-12-31")!;
  if (rangeEnd < anchor || capEnd < rangeStart) return 0;

  let count = 0;
  for (let k = 0; k < 600; k++) {
    const charge =
      frequency === "monthly"
        ? startOfDay(addMonths(anchor, k))
        : startOfDay(addYears(anchor, k));
    if (charge > capEnd) break;
    if (charge >= rangeStart && charge <= rangeEnd) count++;
  }
  return count;
}

/** Inclusive ISO dates (yyyy-MM-dd). */
export function costAmountInPeriod(
  row: CostProjectionInput,
  periodStartIso: string,
  periodEndIso: string
): number {
  const rangeStart = parseDay(periodStartIso);
  const rangeEnd = parseDay(periodEndIso);
  if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return 0;

  const billing = normalizeBillingType(row);
  const amount = row.amount;

  if (billing === "one_time") {
    const d = parseDay(row.entry_date);
    if (!d) return 0;
    return d >= rangeStart && d <= rangeEnd ? amount : 0;
  }

  if (row.recurring_active === false) return 0;

  const anchor = subscriptionAnchor(row);
  if (!anchor) return 0;
  const subEnd = subscriptionEnd(row);
  if (subEnd && subEnd < anchor) return 0;

  const n =
    billing === "monthly"
      ? countAnchorChargesInRange(
          anchor,
          "monthly",
          subEnd,
          rangeStart,
          rangeEnd
        )
      : countAnchorChargesInRange(
          anchor,
          "yearly",
          subEnd,
          rangeStart,
          rangeEnd
        );
  return n * amount;
}

/** Ledger / filter: row touches the optional [from, to] window. */
export function expenseRowTouchesDateWindow(
  row: CostProjectionInput,
  from?: string | null,
  to?: string | null
): boolean {
  if (!from?.trim() && !to?.trim()) return true;
  const f = (from?.trim().slice(0, 10) ?? "1970-01-01") || "1970-01-01";
  const t = (to?.trim().slice(0, 10) ?? "9999-12-31") || "9999-12-31";
  if (f > t) return true;

  const billing = normalizeBillingType(row);
  if (billing === "one_time") {
    const d = row.entry_date.slice(0, 10);
    return d >= f && d <= t;
  }

  if (row.recurring_active === false) return false;

  const anchor = subscriptionAnchor(row);
  if (!anchor) return false;
  const subEnd = subscriptionEnd(row);
  const subStartIso = format(anchor, "yyyy-MM-dd");
  const subEndIso = subEnd ? format(subEnd, "yyyy-MM-dd") : "9999-12-31";
  return !(t < subStartIso || f > subEndIso);
}

export function isRecurringCostRule(row: CostProjectionInput): boolean {
  return normalizeBillingType(row) !== "one_time";
}

export function nextChargeDateIso(
  row: CostProjectionInput,
  fromIso: string
): string | null {
  if (normalizeBillingType(row) === "one_time") return null;
  if (row.recurring_active === false) return null;
  const from = parseDay(fromIso);
  const anchor = subscriptionAnchor(row);
  if (!from || !anchor) return null;
  const subEnd = subscriptionEnd(row);
  const billing = normalizeBillingType(row);
  const freq = billing === "monthly" ? "monthly" : "yearly";

  for (let k = 0; k < 600; k++) {
    const charge =
      freq === "monthly"
        ? startOfDay(addMonths(anchor, k))
        : startOfDay(addYears(anchor, k));
    if (subEnd && charge > subEnd) return null;
    if (charge >= from) return format(charge, "yyyy-MM-dd");
  }
  return null;
}

/** Short line for expenses table / subtitles. */
export function costRecurringContextLine(
  row: CostProjectionInput,
  todayIso: string
): string | null {
  const billing = normalizeBillingType(row);
  if (billing === "one_time") return null;
  if (row.recurring_active === false) return "Paused";
  const next = nextChargeDateIso(row, todayIso);
  if (next) {
    return `Next charge ${format(parseISO(next), "MMM d, yyyy")}`;
  }
  return billing === "monthly" ? "Recurring monthly" : "Recurring yearly";
}
