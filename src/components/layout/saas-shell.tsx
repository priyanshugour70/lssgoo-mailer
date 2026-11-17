import { MailerMark } from "@/components/brand/mailer-mark";
import { MobileDock } from "@/components/layout/mobile-dock";
import { UserProvider } from "@/hooks/auth/use-current-user";
import { UserMenu } from "@/components/layout/user-menu";
import type { CurrentUser } from "@/types/auth/principal";

export function SaasShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: CurrentUser;
}) {
  const userPromise = Promise.resolve(user);

  return (
    <UserProvider userPromise={userPromise}>
      <div className="saas-app-bg flex min-h-svh flex-col">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-gradient-to-r from-sky-600 via-violet-600 to-rose-500 text-white shadow-md">
          <div
            className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <div className="flex items-center gap-3">
              <MailerMark size="sm" className="shadow-violet-900/20" />
              <div className="flex flex-col">
                <p className="text-sm font-semibold leading-tight">Lssgoo Mailer</p>
                <p className="text-[11px] text-white/80">SaaS workspace</p>
              </div>
            </div>
            <div className="hidden md:block">
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-8">
          <div className="md:hidden">
            <UserMenu compact />
          </div>
          {children}
        </main>

        <MobileDock />
      </div>
    </UserProvider>
  );
}