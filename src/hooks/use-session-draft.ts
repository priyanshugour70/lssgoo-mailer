"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persists an in-progress form to sessionStorage so a refresh or accidental
 * navigation doesn't lose work. Storage access is always guarded (private mode,
 * blocked storage). Never store secrets here.
 */
export function useSessionDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw ? ({ ...initial, ...JSON.parse(raw) } as T) : initial;
    } catch {
      return initial;
    }
  });
  const cleared = useRef(false);

  useEffect(() => {
    if (cleared.current) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — draft just isn't persisted */
    }
  }, [key, value]);

  const clear = useCallback(() => {
    cleared.current = true;
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);

  return [value, setValue, clear] as const;
}
