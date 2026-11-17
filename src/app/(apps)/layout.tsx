import { Suspense } from "react";

import { AppFrame } from "@/components/layout/app-frame";
import { SessionFallback } from "@/components/layout/session-fallback";

export const instant = false;

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SessionFallback />}>
      <AppFrame>{children}</AppFrame>
    </Suspense>
  );
}
