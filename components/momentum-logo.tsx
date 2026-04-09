import Image from "next/image";
import { cn } from "@/lib/utils";

type MomentumLogoProps = {
  className?: string;
  iconOnly?: boolean;
  size?: "default" | "lg";
};

/**
 * Brand: `/public/momentum-logo.svg` + “Momentum” wordmark. Swap the SVG when your mark is ready.
 */
export function MomentumLogo({
  className,
  iconOnly,
  size = "default",
}: MomentumLogoProps) {
  const iconH = size === "lg" ? 28 : 26;
  const textClass =
    size === "lg"
      ? "text-[20px] font-bold tracking-tight text-[#111111]"
      : "text-[18px] font-semibold tracking-tight text-[#111111]";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/momentum-mark.svg"
        alt="Momentum"
        width={40}
        height={iconH}
        priority
        className={cn("w-auto object-contain", size === "lg" ? "h-7" : "h-[26px]")}
      />
      {!iconOnly ? <span className={textClass}>Momentum</span> : null}
    </div>
  );
}
