import { MailIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function MailerMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "size-12" : size === "sm" ? "size-8" : "size-10";
  const icon = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5";
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        box,
        className,
      )}
    >
      <MailIcon className={icon} />
    </span>
  );
}
