"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api, errorMessage } from "@/lib/client/api";

/**
 * GET helper with stale-while-revalidate behaviour: data stays on screen while
 * a refresh is in flight (`refreshing`), so lists never flash empty after a
 * mutation. Aborts superseded requests.
 */
export function useMailerFetch<T>(path: string, options?: { skip?: boolean }) {
  const skip = options?.skip ?? false;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [refreshing, setRefreshing] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setRefreshing(true);
    setError(null);
    try {
      const json = await api<T>(path, { signal: next.signal });
      if (next.signal.aborted) return;
      setData(json);
    } catch (err) {
      if (next.signal.aborted) return;
      setError(errorMessage(err));
    } finally {
      if (!next.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [path]);

  useEffect(() => {
    if (skip) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    return () => controller.current?.abort();
  }, [reload, skip]);

  return { data, error, loading, refreshing, reload };
}
