"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { MailerMark } from "@/components/brand/mailer-mark";
import { AccountMenu } from "@/components/layout/account-menu";
import { isActive, navItems } from "@/components/layout/nav-items";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-topbar hidden w-sidebar flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-topbar items-center gap-2.5 px-4">
        <MailerMark size="sm" />
        <span className="text-sm font-semibold tracking-tight">Lssgoo Mailer</span>
      </div>

      <div className="px-3 pb-2">
        <Link href="/send" className={cn(buttonVariants({ size: "default" }), "w-full justify-center")}>
          <PlusIcon data-icon="inline-start" />
          New campaign
        </Link>
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <AccountMenu expanded side="top" />
      </div>
    </aside>
  );
}
