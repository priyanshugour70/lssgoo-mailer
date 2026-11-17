"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3Icon, HomeIcon, LogOutIcon } from "lucide-react";

import { signOut } from "@/action/auth/sign-out";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/#live-time", label: "Time", icon: Clock3Icon },
] as const;

export function MobileDock() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex w-full max-w-lg items-stretch justify-around px-2 pt-2">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : false;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-colors",
                active
                  ? "text-violet-600"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "text-violet-600")} />
              {item.label}
            </Link>
          );
        })}
        <form action={signOut} className="flex min-w-16 flex-1">
          <button
            type="submit"
            className="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium text-rose-600 transition-colors hover:text-rose-700"
          >
            <LogOutIcon className="size-5" />
            Exit
          </button>
        </form>
      </div>
    </nav>
  );
}