"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type ProjectAvatarProps = {
  name: string;
  logoUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
};

function initialsFromName(name: string) {
  const clean = name.trim();
  if (!clean) return "P";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function ProjectAvatar({
  name,
  logoUrl,
  className,
  size = "md",
}: ProjectAvatarProps) {
  const sizeClass = size === "lg" ? "size-12" : size === "sm" ? "size-7" : "size-9";
  const textClass =
    size === "lg" ? "text-sm" : size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/80",
        sizeClass,
        className
      )}
      aria-label={`${name} logo`}
      title={name}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={`${name} logo`} fill className="object-cover" sizes="48px" />
      ) : (
        <span className={cn("font-semibold uppercase tracking-[0.04em]", textClass)}>
          {initialsFromName(name)}
        </span>
      )}
    </span>
  );
}
