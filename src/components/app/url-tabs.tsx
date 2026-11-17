"use client";

import { useUrlState } from "@/hooks/use-url-state";
import { cn } from "@/lib/utils";

/** Tab strip whose selection lives in `?<param>=` so it survives refresh/share. */
export function UrlTabs<T extends string>({
  param = "tab",
  options,
  label,
  clear = [],
}: {
  param?: string;
  label: string;
  options: { value: T; label: string; count?: number }[];
  /** Other params to reset when switching tab (e.g. search, page). */
  clear?: string[];
}) {
  const url = useUrlState();
  const current = (url.get(param) as T) || options[0].value;

  return (
    <div
      role="tablist"
      aria-label={label}
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0 [scrollbar-width:none]"
    >
      {options.map((option, index) => {
        const active = option.value === current;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              const step = event.key === "ArrowRight" ? 1 : -1;
              const next = options[(index + step + options.length) % options.length];
              url.set({
                [param]: next.value === options[0].value ? null : next.value,
                ...Object.fromEntries(clear.map((key) => [key, null])),
              });
            }}
            onClick={() =>
              url.set({
                [param]: option.value === options[0].value ? null : option.value,
                ...Object.fromEntries(clear.map((key) => [key, null])),
              })
            }
            className={cn(
              "relative -mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors md:min-h-10",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {typeof option.count === "number" && option.count > 0 ? (
              <span className="rounded-md bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function useTab<T extends string>(first: T, param = "tab") {
  const url = useUrlState();
  return (url.get(param) as T) || first;
}
