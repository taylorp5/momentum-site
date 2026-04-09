import {
  AtSign,
  Camera,
  Globe2,
  MessageCircle,
  PlayCircle,
  Rocket,
  Video,
} from "lucide-react";
import type { DistributionPlatform } from "@/types/momentum";
import { PLATFORM_CONFIG } from "@/lib/platform-config";

type PlatformIconProps = {
  platform: DistributionPlatform;
  className?: string;
};

export function PlatformIcon({ platform, className }: PlatformIconProps) {
  const icon = PLATFORM_CONFIG[platform].icon;
  const Cmp =
    icon === "message-circle"
      ? MessageCircle
      : icon === "video"
        ? Video
        : icon === "at-sign"
          ? AtSign
          : icon === "rocket"
            ? Rocket
            : icon === "camera"
              ? Camera
              : icon === "play-circle"
                ? PlayCircle
                : Globe2;
  return <Cmp className={className} strokeWidth={1.7} />;
}
