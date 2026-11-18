/**
 * Shared helper for calling the Sync backend. Every page goes through apiFetch
 * so the base URL, login token, and error handling live in one place.
 *
 * The session is kept in localStorage:
 *   sync_token  the JWT from /api/auth/login or /register (sent on every request)
 *   sync_user   { id, name, email, role } so pages can greet the user without a request
 */

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:5001";
export const TOKEN_KEY = "sync_token";
export const USER_KEY = "sync_user";

export type SessionUser = { id: string; name: string; email: string; role: "student" | "advisor" | "admin" };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export function saveSession(token: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Storage blocked: nothing to clear
  }
}

/** The session ended (expired token, deleted account): forget it and go to the log in page */
function endSession(): never {
  clearSession();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
  throw new ApiError(401, "Your session has ended. Please log in again.");
}

type Options = {
  /** false for requests made before logging in (login, register) */
  auth?: boolean;
};

export async function apiFetch<T>(path: string, init: RequestInit = {}, { auth = true }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) endSession();
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  } catch {
    throw new ApiError(0, "Can't reach the Sync server. Make sure the backend is running, then try again.");
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = typeof body.error === "string" ? body.error : `Request failed (${res.status}).`;
    // 401, or 403 for a bad token, means the login is no longer valid
    if (auth && (res.status === 401 || (res.status === 403 && /token/i.test(message)))) endSession();
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}

/** A readable message for any error thrown by apiFetch */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  return error instanceof ApiError ? error.message : fallback;
}
