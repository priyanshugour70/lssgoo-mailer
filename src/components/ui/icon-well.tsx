import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const tones = {
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
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