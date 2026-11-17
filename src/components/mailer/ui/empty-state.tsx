import type { LucideIcon } from "lucide-react";

import { IconWell } from "@/components/ui/icon-well";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-brand-matte/40 px-6 py-10 text-center">
      <IconWell icon={Icon} tone="matte" />
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}