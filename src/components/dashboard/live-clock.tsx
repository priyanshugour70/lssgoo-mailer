"use client";

import { Clock3Icon, Globe2Icon } from "lucide-react";

import { IconWell } from "@/components/ui/icon-well";
import { useLiveClock } from "@/hooks/use-live-clock";

export function LiveClockPanel() {
  const { clock, day, timeZoneLabel } = useLiveClock();

  return (
    <section
      id="live-time"
      className="animate-in fade-in slide-in-from-bottom-3 rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm duration-500 fill-mode-both"
    >
      <div className="flex items-start gap-3">
        <IconWell icon={Clock3Icon} tone="amber" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Local time
          </p>
          <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {clock}
          </p>
          <p className="text-sm text-muted-foreground">{day}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe2Icon className="size-3.5" />
            {timeZoneLabel}
          </p>
        </div>
      </div>
    </section>
  );
}