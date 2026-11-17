export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const FRIENDLY: Record<string, string> = {
  invalid_body: "Some of the details are missing or invalid. Check the form and try again.",
  unauthorized: "Your session has expired. Please sign in again.",
  not_found: "That item no longer exists.",
};

/**
 * Typed JSON request helper. Throws ApiError with a human-readable message
 * (API error codes are translated), and redirects to sign-in on 401.
 */
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers: options.body ? { "content-type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Check your connection and retry.", 0);
  }

  if (response.status === 401 && typeof window !== "undefined") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload intentionally clears client state
    window.location.href = "/sign-in";
  }

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    const code = payload?.error;
    throw new ApiError(
      (code && (FRIENDLY[code] ?? code)) || `Request failed (${response.status}).`,
      response.status,
      payload,
    );
  }
  return payload as T;
}

export function errorMessage(error: unknown, fallback = "Something went wrong.") {
  return error instanceof Error ? error.message : fallback;
}
