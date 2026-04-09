import type { DistributionPlatform } from "@/types/momentum";

/** Result of image classification after OCR + rules (visual fallback is last resort). */
export type ImageClassification =
  | "analytics_financial"
  | "analytics_distribution"
  | "content_asset"
  | "document"
  | "unknown";

export type ClassificationSignals = {
  /** Analytics */
  revenue?: number;
  revenueConfidenceOk?: boolean;
  views?: number;
  likes?: number;
  comments?: number;
  metricsSummary?: string;
  timeRangeLabel?: string;
  customers?: number;
  platform?: DistributionPlatform;
  /** Content / design */
  likelyLogo?: boolean;
  likelyUi?: boolean;
  likelyProductVisual?: boolean;
  /** Document */
  textHeavy?: boolean;
};

export type ClassificationResult = {
  classification: ImageClassification;
  /** 0–1; use with `isLowConfidenceClassification`. */
  confidence: number;
  /** Short label for the review chip */
  title: string;
  /** One-line explanation for the review screen. */
  summary: string;
  signals: ClassificationSignals;
  /** Full OCR output (may be empty if OCR failed or image has no text). */
  extractedText: string;
};

const FINANCIAL_KEYWORDS = [
  "revenue",
  "mrr",
  "arr",
  "subscription",
  "billing",
  "customers",
  "stripe",
  "income",
] as const;

const PERFORMANCE_KEYWORDS = [
  "views",
  "likes",
  "comments",
  "impressions",
  "engagement",
] as const;

const CLASS_COPY: Record<
  ImageClassification,
  { title: string; summary: () => string }
> = {
  analytics_financial: {
    title: "Analytics (Financial)",
    summary: () =>
      "Text in the image points to revenue, billing, or money metrics — confirm amounts before saving.",
  },
  analytics_distribution: {
    title: "Analytics (Performance)",
    summary: () =>
      "Text suggests reach or engagement — useful for a performance snapshot or distribution context.",
  },
  content_asset: {
    title: "Content / design",
    summary: () =>
      "Looks like a logo, UI, or product visual — good for branding or timeline context.",
  },
  document: {
    title: "Document / text",
    summary: () =>
      "Looks text-heavy — often best as a note or a simple timeline entry.",
  },
  unknown: {
    title: "Unclear",
    summary: () =>
      "We're not sure what this is — pick how you'd like to save it.",
  },
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Enough text for keyword rules to be trustworthy. */
export function isMeaningfulExtractedText(text: string): boolean {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length < 12) return false;
  const words = s.split(/\s+/).filter(Boolean);
  return words.length >= 2;
}

export function countKeywordHits(text: string, keywords: readonly string[]): number {
  const lower = text.toLowerCase();
  let n = 0;
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) n += 1;
  }
  return n;
}

/** First USD-like amount in the string (OCR — user must still confirm). */
function extractFirstDollarAmount(text: string): number | undefined {
  const m = text.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
  if (!m) return undefined;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function extractCustomerCount(text: string): number | undefined {
  const m = text.match(/([\d,]+)\s+customers?\b/i);
  if (!m) return undefined;
  const n = parseInt(m[1].replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

function extractCountBeforeWord(text: string, word: string): number | undefined {
  const re = new RegExp(`([\\d,]+)\\s+${word}\\b`, "i");
  const m = text.match(re);
  if (!m) return undefined;
  const n = parseInt(m[1].replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Pull numbers from performance-related phrases. */
function extractPerformanceStructuredSignals(text: string): ClassificationSignals {
  const s: ClassificationSignals = {};
  const views = extractCountBeforeWord(text, "views?");
  if (views != null) s.views = views;
  const likes = extractCountBeforeWord(text, "likes?");
  if (likes != null) s.likes = likes;
  const comments = extractCountBeforeWord(text, "comments?");
  if (comments != null) s.comments = comments;
  const im = text.match(/([\d,]+)\s+impressions?\b/i);
  if (im) {
    const n = parseInt(im[1].replace(/,/g, ""), 10);
    if (Number.isFinite(n)) s.views = s.views ?? n;
  }
  const parts: string[] = [];
  if (s.views != null) parts.push(`Views ${s.views}`);
  if (s.likes != null) parts.push(`Likes ${s.likes}`);
  if (s.comments != null) parts.push(`Comments ${s.comments}`);
  if (parts.length > 0) s.metricsSummary = parts.join(" · ");
  return s;
}

/** Financial + optional embedded performance numbers. */
function extractFinancialStructuredSignals(text: string): ClassificationSignals {
  const perf = extractPerformanceStructuredSignals(text);
  const customers = extractCustomerCount(text);
  const revenue = extractFirstDollarAmount(text);
  const next: ClassificationSignals = { ...perf };
  if (customers != null) next.customers = customers;
  if (revenue != null) {
    next.revenue = revenue;
    next.revenueConfidenceOk = true;
  }
  return next;
}

/**
 * Primary classifier: OCR text drives keyword buckets; visual/heuristic only if
 * there is no meaningful text or no keyword hits.
 */
export function classifyScreenshotAfterOcr(
  extractedTextRaw: string,
  file: File
): ClassificationResult {
  const extractedText = extractedTextRaw.trim();

  if (isMeaningfulExtractedText(extractedText)) {
    const financialHits = countKeywordHits(extractedText, FINANCIAL_KEYWORDS);
    const performanceHits = countKeywordHits(extractedText, PERFORMANCE_KEYWORDS);

    if (financialHits > 0) {
      const confidence = financialHits >= 2 ? 0.92 : 0.78;
      return {
        classification: "analytics_financial",
        confidence,
        title: CLASS_COPY.analytics_financial.title,
        summary: CLASS_COPY.analytics_financial.summary(),
        signals: extractFinancialStructuredSignals(extractedText),
        extractedText,
      };
    }

    if (performanceHits > 0) {
      const confidence = performanceHits >= 2 ? 0.9 : 0.76;
      return {
        classification: "analytics_distribution",
        confidence,
        title: CLASS_COPY.analytics_distribution.title,
        summary: CLASS_COPY.analytics_distribution.summary(),
        signals: extractPerformanceStructuredSignals(extractedText),
        extractedText,
      };
    }
  }

  const visual = classifyImageVisualFallback(file, extractedText);
  return { ...visual, extractedText };
}

/**
 * Last-resort classifier (filename hints + fingerprint). Does not override
 * keyword-based analytics — only used when OCR had nothing useful or no keywords matched.
 */
function classifyImageVisualFallback(
  file: File,
  extractedText: string
): Omit<ClassificationResult, "extractedText"> {
  const name = file.name.toLowerCase();
  const hintContent =
    /logo|brand|icon|ui|design|screen|mock|figma|hero|banner|asset/.test(name);
  const hintDoc =
    /doc|text|email|letter|pdf|note|contract|slack|notion|readme/.test(name);

  let bucket = hashString(`${file.name}:${file.size}`) % 5;
  if (hintContent) bucket = 1;
  else if (hintDoc) bucket = 2;
  else if (bucket === 4) bucket = 3;

  const ocrLooksTextHeavy =
    extractedText.length > 80 && /\w{4,}/.test(extractedText);

  if (bucket === 1) {
    const confidence = hintContent ? 0.84 : 0.7;
    return {
      classification: "content_asset",
      confidence,
      title: CLASS_COPY.content_asset.title,
      summary: CLASS_COPY.content_asset.summary(),
      signals: {
        likelyLogo: true,
        likelyUi: true,
        likelyProductVisual: confidence > 0.75,
        textHeavy: ocrLooksTextHeavy,
      },
    };
  }

  if (bucket === 2 || ocrLooksTextHeavy) {
    return {
      classification: "document",
      confidence: hintDoc ? 0.78 : ocrLooksTextHeavy ? 0.72 : 0.68,
      title: CLASS_COPY.document.title,
      summary: CLASS_COPY.document.summary(),
      signals: {
        textHeavy: true,
      },
    };
  }

  return {
    classification: "unknown",
    confidence: 0.41,
    title: CLASS_COPY.unknown.title,
    summary: CLASS_COPY.unknown.summary(),
    signals: {},
  };
}

export function isLowConfidenceClassification(r: ClassificationResult): boolean {
  return r.confidence < 0.55;
}

/** Whether revenue amount can be suggested (never auto-saved). */
export function isRevenuePreFillOk(s: ClassificationSignals): boolean {
  return (
    s.revenueConfidenceOk === true &&
    typeof s.revenue === "number" &&
    Number.isFinite(s.revenue) &&
    s.revenue > 0
  );
}

/** Notes body for a “performance metrics” snapshot from signals. */
export function buildPerformanceNotes(s: ClassificationSignals): string {
  const lines: string[] = [];
  if (s.metricsSummary) lines.push(`Metrics: ${s.metricsSummary}`);
  if (s.views != null) lines.push(`Views: ${s.views}`);
  if (s.likes != null) lines.push(`Likes: ${s.likes}`);
  if (s.comments != null) lines.push(`Comments: ${s.comments}`);
  if (s.timeRangeLabel) lines.push(`Range: ${s.timeRangeLabel}`);
  if (lines.length === 0) return "Performance capture from screenshot (edit as needed).";
  return `${lines.join("\n")}\n\n(Detected from screenshot — confirm before sharing.)`;
}

export function classificationLabel(c: ImageClassification): string {
  switch (c) {
    case "analytics_financial":
      return "Analytics (Financial)";
    case "analytics_distribution":
      return "Analytics (Performance)";
    case "content_asset":
      return "Content asset";
    case "document":
      return "Document";
    case "unknown":
      return "Unknown";
    default:
      return c;
  }
}
