"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOutIcon, MoreHorizontalIcon, SendIcon, UserRoundIcon } from "lucide-react";

import { signOut } from "@/action/auth/sign-out";
import { MailerMark } from "@/components/brand/mailer-mark";
import { isActive, navItems, titleFor } from "@/components/layout/nav-items";
import { UserAvatar } from "@/components/app/user-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/auth/use-current-user";
import { cn } from "@/lib/utils";

const dockHrefs = ["/", "/contacts", "/send", "/history"];
const moreItems = navItems.filter((item) => !dockHrefs.includes(item.href));

export function MobileTopBar() {
  const pathname = usePathname();
  return (
    <header
      className="sticky top-0 z-topbar flex h-topbar items-center gap-2.5 border-b border-border bg-background/90 px-4 backdrop-blur md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(var(--spacing-topbar) + env(safe-area-inset-top))" }}
    >
      <MailerMark size="sm" />
      <p className="truncate text-base font-semibold tracking-tight">{titleFor(pathname)}</p>
    </header>
  );
}

export function MobileDock() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreItems.some((item) => isActive(pathname, item.href)) || pathname.startsWith("/profile");

  const dockItems = dockHrefs.map((href) => navItems.find((item) => item.href === href)!);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-dock border-t border-border bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid h-dock max-w-lg grid-cols-5 items-center">
          {dockItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const primary = item.href === "/send";
            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-caption font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {primary ? (
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground",
                        active && "ring-2 ring-ring/40",
                      )}
                    >
                      <SendIcon aria-hidden className="size-4" />
                    </span>
                  ) : (
                    <Icon aria-hidden className={cn("size-5", active && "stroke-[2.25]")} />
                  )}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex justify-center">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className={cn(
                "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-caption font-medium transition-colors",
                moreActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <MoreHorizontalIcon aria-hidden className="size-5" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>More</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <UserAvatar name={user.name} imageUrl={user.imageUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <ul className="flex flex-col">
            {[...moreItems, { href: "/profile", label: "Profile", icon: UserRoundIcon }].map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-base hover:bg-muted"
                  >
                    <Icon aria-hidden className="size-5 text-muted-foreground" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-base hover:bg-muted"
              >
                <LogOutIcon aria-hidden className="size-5 text-muted-foreground" />
                Sign out
              </button>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
