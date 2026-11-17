import { AppProviders } from "@/components/app/providers";
import { MobileDock, MobileTopBar } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { UserProvider } from "@/hooks/auth/use-current-user";
import type { CurrentUser } from "@/types/auth/principal";

export function SaasShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: CurrentUser;
}) {
  return (
    <UserProvider userPromise={Promise.resolve(user)}>
      <AppProviders>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-toast focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Sidebar />
        <div className="flex min-h-svh flex-col md:pl-sidebar">
          <MobileTopBar />
          <main
            id="main"
            className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5 pb-[calc(var(--spacing-dock)+env(safe-area-inset-bottom)+1.5rem)] md:px-8 md:py-8 md:pb-10"
          >
            {children}
          </main>
        </div>
        <MobileDock />
      </AppProviders>
    </UserProvider>
  );
}
