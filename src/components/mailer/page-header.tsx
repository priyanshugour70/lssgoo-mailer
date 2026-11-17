import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  backHref = "/",
  action,
}: {
  title: string;
  description?: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1 rounded-lg py-1 text-sm font-medium text-brand-blue active:opacity-70"
        >
          <ChevronLeftIcon className="size-4" />
          Back
        </Link>
        {action}
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </header>
  );
}