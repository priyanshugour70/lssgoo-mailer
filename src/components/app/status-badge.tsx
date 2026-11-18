import { Badge } from "@/components/ui/badge";

const variants = {
  sent: "success",
  completed: "success",
  accepted: "success",
  validated: "success",
  running: "info",
  pending: "warning",
  skipped: "neutral",
  draft: "neutral",
  cancelled: "neutral",
  rejected: "destructive",
  failed: "destructive",
  "not validated": "warning",
} as const;

export function StatusBadge({ status }: { status: string }) {
  const variant = variants[status as keyof typeof variants] ?? "neutral";
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}
