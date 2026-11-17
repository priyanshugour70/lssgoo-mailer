"use client";

import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { LiveClockPanel } from "@/components/dashboard/live-clock";
import { StatusGrid } from "@/components/dashboard/status-grid";
import { useCurrentUser } from "@/hooks/auth/use-current-user";

export function SaaSWorkspace() {
  const user = useCurrentUser();

  return (
    <div className="flex flex-col gap-5 pb-6">
      <WelcomeHero user={user} />
      <LiveClockPanel />
      <StatusGrid />
    </div>
  );
}