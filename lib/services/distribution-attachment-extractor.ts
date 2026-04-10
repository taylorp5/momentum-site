import type { DistributionPlatform } from "@/types/momentum";

const MOCK_DISABLED =
  process.env.METRICS_EXTRACTION_MOCK === "false" ||
  process.env.METRICS_EXTRACTION_MOCK === "0";

export type ExtractDistributionMetricsResult =
  | {
      status: "completed";
      platform?: DistributionPlatform;
      views?: number;
      likes?: number;
      comments?: number;
      payload?: Record<string, unknown>;
    }
  | {
      status: "failed";
      error: string;
      payload?: Record<string, unknown>;
    };

function parseMetricToken(name: string, key: string): number | undefined {
  const m = name.match(new RegExp(`${key}[_-]?(\\d+)`, "i"));
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

function parseLikes(name: string): number | undefined {
  return parseMetricToken(name, "likes") ?? parseMetricToken(name, "upvotes");
}

function detectPlatform(name: string): DistributionPlatform | undefined {
  if (/\breddit\b/i.test(name)) return "reddit";
  if (/\btiktok\b/i.test(name)) return "tiktok";
  if (/\b(x|twitter)\b/i.test(name)) return "twitter";
  if (/\blinkedin\b/i.test(name)) return "linkedin";
  if (/product[_-]?hunt/i.test(name)) return "product_hunt";
  if (/\binstagram\b/i.test(name)) return "instagram";
  if (/\byoutube\b/i.test(name)) return "youtube";
  return undefined;
}

/**
 * Deterministic mock for end-to-end UX until a vision/OCR provider is wired.
 * Set METRICS_EXTRACTION_MOCK=false to only use filename hints (often none).
 */
function mockExtractionResult(args: {
  imagePath: string;
  entryPlatform?: DistributionPlatform;
}): ExtractDistributionMetricsResult {
  let h = 0;
  for (let i = 0; i < args.imagePath.length; i++) {
    h = (h * 31 + args.imagePath.charCodeAt(i)) >>> 0;
  }
  const views = 104 + (h % 37);
  const likes = 1 + (h % 4);
  const comments = h % 5 === 0 ? 3 + (h % 12) : undefined;
  return {
    status: "completed",
    platform: args.entryPlatform ?? "reddit",
    views,
    likes,
    comments,
    payload: {
      strategy: "mock-v1",
      note: "Replace with vision/OCR provider; mock enabled by default.",
    },
  };
}

/**
 * Swappable extraction boundary for OCR/vision providers.
 * Order: filename hints (dev) → mock fallback (default) → optional filename-only mode.
 */
export async function extractDistributionMetricsFromImage(args: {
  imagePath: string;
  entryPlatform?: DistributionPlatform;
}): Promise<ExtractDistributionMetricsResult> {
  const filename = args.imagePath.split("/").pop() ?? args.imagePath;
  const platform = detectPlatform(filename);
  const views = parseMetricToken(filename, "views");
  const likes = parseLikes(filename);
  const comments = parseMetricToken(filename, "comments");

  const hasFilenameSignal =
    platform !== undefined ||
    views !== undefined ||
    likes !== undefined ||
    comments !== undefined;

  if (hasFilenameSignal) {
    return {
      status: "completed",
      platform,
      views,
      likes,
      comments,
      payload: { strategy: "filename-parser", filename },
    };
  }

  if (!MOCK_DISABLED) {
    return mockExtractionResult(args);
  }

  return {
    status: "failed",
    error:
      "We could not confidently extract metrics from this screenshot yet.",
    payload: { strategy: "filename-parser", filename },
  };
}
