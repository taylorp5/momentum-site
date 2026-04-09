import type { DistributionPlatform, TimelineEntryType } from "@/types/momentum";

export type IntakeKind =
  | "distribution_performance"
  | "revenue_analytics"
  | "cost_receipt"
  | "outreach_conversation"
  | "product_moment"
  | "auto";

export type IntakeDestination =
  | "timeline"
  | "distribution"
  | "costs"
  | "revenue"
  | "outreach"
  | "swipe_file";

export type DetectionResult = {
  source: string;
  confidence: number;
  suggestedDestination: IntakeDestination;
  platform?: DistributionPlatform;
  views?: number;
  likes?: number;
  comments?: number;
  amount?: number;
  category?: string;
  revenueSource?: string;
  summary: string;
};

export function mockDetectScreenshot(kind: IntakeKind): DetectionResult {
  switch (kind) {
    case "distribution_performance":
      return {
        source: "Reddit analytics screenshot",
        confidence: 0.89,
        suggestedDestination: "distribution",
        platform: "reddit",
        views: 155,
        likes: 14,
        comments: 6,
        summary: "Detected a post performance screenshot with engagement metrics.",
      };
    case "revenue_analytics":
      return {
        source: "Revenue dashboard screenshot",
        confidence: 0.84,
        suggestedDestination: "revenue",
        amount: 499,
        revenueSource: "subscriptions",
        summary: "Detected monthly revenue signal from analytics.",
      };
    case "cost_receipt":
      return {
        source: "Receipt / billing screenshot",
        confidence: 0.86,
        suggestedDestination: "costs",
        amount: 49,
        category: "tools",
        summary: "Detected a likely operating expense.",
      };
    case "outreach_conversation":
      return {
        source: "DM / outreach thread screenshot",
        confidence: 0.77,
        suggestedDestination: "outreach",
        summary: "Detected conversation context suitable for outreach notes.",
      };
    case "product_moment":
      return {
        source: "Product UI screenshot",
        confidence: 0.8,
        suggestedDestination: "timeline",
        summary: "Detected a product moment suitable for timeline logging.",
      };
    case "auto":
    default:
      return {
        source: "General screenshot",
        confidence: 0.66,
        suggestedDestination: "timeline",
        summary: "Momentum suggests reviewing this as a timeline event.",
      };
  }
}

export function destinationToTimelineType(destination: IntakeDestination): TimelineEntryType {
  if (destination === "distribution") return "distribution";
  if (destination === "costs") return "cost";
  if (destination === "revenue") return "revenue";
  return "note";
}
