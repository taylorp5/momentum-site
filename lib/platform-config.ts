import type { DistributionPlatform } from "@/types/momentum";

export type PlatformIconKey =
  | "message-circle"
  | "video"
  | "at-sign"
  | "rocket"
  | "camera"
  | "play-circle"
  | "globe";

export type PlatformConfig = {
  label: string;
  icon: PlatformIconKey;
  accent: string;
};

export const PLATFORM_CONFIG: Record<DistributionPlatform, PlatformConfig> = {
  reddit: { label: "Reddit", icon: "message-circle", accent: "#f97316" },
  tiktok: { label: "TikTok", icon: "video", accent: "#e879f9" },
  twitter: { label: "Twitter / X", icon: "at-sign", accent: "#38bdf8" },
  linkedin: { label: "LinkedIn", icon: "at-sign", accent: "#60a5fa" },
  product_hunt: { label: "Product Hunt", icon: "rocket", accent: "#fb7185" },
  instagram: { label: "Instagram", icon: "camera", accent: "#f472b6" },
  youtube: { label: "YouTube", icon: "play-circle", accent: "#f87171" },
  other: { label: "Other", icon: "globe", accent: "#a1a1aa" },
};

export const PLATFORM_ORDER = Object.keys(PLATFORM_CONFIG) as DistributionPlatform[];
