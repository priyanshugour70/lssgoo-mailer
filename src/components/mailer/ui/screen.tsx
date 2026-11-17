import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MailerScreen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5 pb-10", className)}>{children}</div>
  );
}