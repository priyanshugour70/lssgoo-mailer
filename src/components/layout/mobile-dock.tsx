"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  MailIcon,
  SendIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items: {
  href: string;
  label: string;
  icon: typeof HomeIcon;
  emphasize?: boolean;
}[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/contacts", label: "Contacts", icon: MailIcon },
  { href: "/send", label: "Send", icon: SendIcon, emphasize: true },
  { href: "/people", label: "People", icon: UsersIcon },
  { href: "/setup", label: "Setup", icon: Settings2Icon },
];

export function MobileDock() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex w-full max-w-lg items-end justify-between px-1 pt-1.5">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-[3.25rem] min-w-[3rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 pb-1 text-[10px] font-semibold transition-colors",
                active ? "text-brand-blue" : "text-muted-foreground",
                item.emphasize &&
                  "mx-0.5 -mt-3 min-h-14 min-w-14 flex-none rounded-2xl bg-brand-cocoa text-brand-paper shadow-md",
                item.emphasize && active && "ring-2 ring-brand-green/50",
              )}
            >
              <Icon className={cn("size-5", item.emphasize && "size-6")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}