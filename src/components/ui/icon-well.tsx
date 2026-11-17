import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const tones = {
  blue: "bg-brand-blue-muted text-brand-blue",
  green: "bg-brand-green-muted text-brand-green",
  matte: "bg-brand-matte text-foreground",
  black: "bg-foreground/8 text-foreground",
} as const;

export function IconWell({
  icon: Icon,
  tone,
  className,
}: {
  icon: LucideIcon;
  tone: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-2xl",
        tones[tone],
        className,
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}