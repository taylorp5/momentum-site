import type { DistributionPlatform } from "@/types/momentum";

/** Result of image classification (mock / future vision API). */
export type ImageClassification =
  | "analytics"
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
  /** Short label, e.g. "Analytics dashboard" */
  title: string;
  /** One-line explanation for the review screen. */
  summary: string;
  signals: ClassificationSignals;
};

const CLASS_COPY: Record<
  ImageClassification,
  { title: string; summary: (c: number) => string }
> = {
  analytics: {
    title: "Analytics",
    summary: () =>
      "Looks like charts, metrics, or a dashboard — we may be able to pull numbers for you to confirm.",
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
      "We’re not sure what this is — pick how you’d like to save it.",
  },
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Deterministic mock classifier. Replace with vision / OCR pipeline later.
 * Filename hints nudge the class; otherwise bucket by file fingerprint.
 */
export function classifyImageMock(file: File): ClassificationResult {
  const name = file.name.toLowerCase();
  const hintAnalytics =
    /chart|metric|analytics|revenue|dashboard|stats|kpi|graph|insight|report|stripe|paddle|mrr/.test(
      name
    );
  const hintContent =
    /logo|brand|icon|ui|design|screen|mock|figma|hero|banner|asset/.test(name);
  const hintDoc =
    /doc|text|email|letter|pdf|note|contract|slack|notion|readme/.test(name);

  let bucket = hashString(`${file.name}:${file.size}`) % 5;
  if (hintAnalytics) bucket = 0;
  else if (hintContent) bucket = 1;
  else if (hintDoc) bucket = 2;
  else if (bucket === 4) bucket = 3;

  if (bucket === 0) {
    const confidence = hintAnalytics ? 0.86 : 0.74;
    return {
      classification: "analytics",
      confidence,
      title: CLASS_COPY.analytics.title,
      summary: CLASS_COPY.analytics.summary(confidence),
      signals: {
        revenue: 56,
        revenueConfidenceOk: confidence >= 0.72,
        views: 1280,
        likes: 42,
        comments: 7,
        metricsSummary: "CTR 2.4% · Sessions 3.1k",
        timeRangeLabel: "Last 28 days",
        customers: 52,
        platform: "other",
      },
    };
  }

  if (bucket === 1) {
    const confidence = hintContent ? 0.84 : 0.7;
    return {
      classification: "content_asset",
      confidence,
      title: CLASS_COPY.content_asset.title,
      summary: CLASS_COPY.content_asset.summary(confidence),
      signals: {
        likelyLogo: true,
        likelyUi: true,
        likelyProductVisual: confidence > 0.75,
      },
    };
  }

  if (bucket === 2) {
    return {
      classification: "document",
      confidence: hintDoc ? 0.78 : 0.68,
      title: CLASS_COPY.document.title,
      summary: CLASS_COPY.document.summary(0.78),
      signals: {
        textHeavy: true,
      },
    };
  }

  return {
    classification: "unknown",
    confidence: 0.41,
    title: CLASS_COPY.unknown.title,
    summary: CLASS_COPY.unknown.summary(0.41),
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
    case "analytics":
      return "Analytics";
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
