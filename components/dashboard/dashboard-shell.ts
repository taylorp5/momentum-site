/**
 * Shared visual tokens for dashboard surfaces — Linear / Notion–style clarity.
 * 12px radius (rounded-xl), #eee border, neutral type, color only for meaning.
 */
export const dashCard =
  "rounded-xl border border-zinc-200/85 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.2)] transition-all duration-200 ease-out hover:bg-zinc-50/30 hover:border-zinc-300/70 hover:shadow-[0_10px_28px_-16px_rgba(15,23,42,0.22)]";

export const dashCardHeader =
  "border-b border-zinc-200/80 px-5 pb-4 pt-5";

export const dashSectionEyebrow =
  "text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500";

export const dashSectionTitle =
  "text-[13px] font-medium tracking-tight text-zinc-900";

export const dashSectionDesc =
  "mt-1 text-[13px] font-normal leading-relaxed text-zinc-500";

/** Growth / positive metrics (e.g. views). */
export const dashMetricGrowth = "font-semibold tabular-nums text-blue-600";

/** Activity / cadence framing (section accents). */
export const dashMetricActivity = "text-orange-600";
