import {
  HistoryIcon,
  LayoutDashboardIcon,
  SendIcon,
  Settings2Icon,
  UsersIcon,
  BookUserIcon,
  MailsIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  title: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Overview", title: "Overview", icon: LayoutDashboardIcon },
  { href: "/send", label: "Send", title: "New campaign", icon: SendIcon },
  { href: "/campaigns", label: "Campaigns", title: "Campaigns", icon: MailsIcon },
  { href: "/contacts", label: "Contacts", title: "Contacts", icon: BookUserIcon },
  { href: "/history", label: "History", title: "Send history", icon: HistoryIcon },
  { href: "/setup", label: "Setup", title: "Setup", icon: Settings2Icon },
  { href: "/people", label: "People", title: "People", icon: UsersIcon },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function titleFor(pathname: string) {
  if (pathname.startsWith("/profile")) return "Profile";
  return navItems.find((item) => isActive(pathname, item.href))?.title ?? "Lssgoo Mailer";
}
