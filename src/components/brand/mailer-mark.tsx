import { MailIcon, SparklesIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function MailerMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "lg" ? "size-16" : size === "sm" ? "size-10" : "size-14";
  const icon = size === "lg" ? "size-7" : size === "sm" ? "size-4" : "size-6";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-2xl bg-brand-cocoa text-brand-paper shadow-md shadow-brand-brown/25",
        "animate-[mailer-float_4s_ease-in-out_infinite]",
        box,
        className,
      )}
    >
      <span className="absolute inset-0 rounded-2xl bg-brand-paper/15 blur-sm" />
      <MailIcon className={cn("relative", icon)} />
      <SparklesIcon
        className={cn(
          "absolute -top-1 -right-1 text-brand-green",
          size === "sm" ? "size-3" : "size-4",
        )}
      />
    </div>
  );
}