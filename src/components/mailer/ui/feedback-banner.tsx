import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function FeedbackBanner({
  tone,
  title,
  message,
  className,
}: {
  tone: "success" | "error" | "info";
  title?: string;
  message: string;
  className?: string;
}) {
  const isSuccess = tone === "success";
  const isError = tone === "error";

  return (
    <Alert
      className={cn(
        "border",
        isSuccess && "border-brand-green/30 bg-brand-green-muted/40",
        isError && "border-destructive/30 bg-destructive/5",
        tone === "info" && "border-brand-blue/25 bg-brand-blue-muted/30",
        className,
      )}
    >
      {isSuccess ? (
        <CheckCircle2Icon className="text-brand-green" />
      ) : isError ? (
        <AlertCircleIcon className="text-destructive" />
      ) : (
        <AlertCircleIcon className="text-brand-blue" />
      )}
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}