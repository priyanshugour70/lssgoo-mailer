export function formatClock(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
  }).format(date);
}

export function formatWeekday(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date);
}

export function formatTimeZoneLabel(timeZone: string) {
  const parts = timeZone.split("/");
  return parts[parts.length - 1]?.replaceAll("_", " ") ?? timeZone;
}