"use client";

import { useEffect, useState } from "react";

import {
  formatClock,
  formatTimeZoneLabel,
  formatWeekday,
} from "@/utils/dates/format-time";

export function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return {
    clock: formatClock(now, timeZone),
    day: formatWeekday(now, timeZone),
    timeZone,
    timeZoneLabel: formatTimeZoneLabel(timeZone),
  };
}