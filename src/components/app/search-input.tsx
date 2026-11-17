"use client";

import { useEffect, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

/** Debounced search box. Commits the value after a short pause. */
export function SearchInput({
  value,
  onCommit,
  placeholder,
  label,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  // Sync when the URL value changes externally (reset filters, back button).
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return;
    const id = window.setTimeout(() => onCommit(draft), 250);
    return () => window.clearTimeout(id);
  }, [draft, value, onCommit]);

  return (
    <div className="relative">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setDraft("");
            onCommit("");
          }}
          className="absolute top-1/2 right-1.5 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
