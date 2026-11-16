/**
 * Shared helper for calling the Sync backend. Every page should go through
 * apiFetch so the base URL, auth header, and error handling live in one place.
 */

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:5000";
const TOKEN_KEY = "sync_token";
const USER_KEY = "sync_user";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function readEmail(): string | null {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) ?? "null");
    return user && typeof user.email === "string" ? user.email : null;
  } catch {
    return null;
  }
}

/**
 * Returns the stored JWT, or gets one.
 * TODO: once POST /api/auth/login exists, the sign-in page should save the
 * token it returns under TOKEN_KEY and this demo-token fallback should go.
 */
async function getToken(): Promise<string> {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) return stored;

  const email = readEmail() ?? "student@gsu.edu";
  const res = await fetch(`${API_URL}/api/auth/demo-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, id: email, role: "student" }),
  });
  if (!res.ok) throw new ApiError(res.status, "Couldn't sign in to the Sync server.");
  const { token } = (await res.json()) as { token: string };
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    const token = await getToken();
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, "Can't reach the Sync server. Make sure the backend is running, then try again.");
  }

  if (!res.ok) {
    // An expired or bad token: forget it so the next request gets a fresh one
    if (res.status === 401 || res.status === 403) localStorage.removeItem(TOKEN_KEY);
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status}).`);
  }
  return (await res.json()) as T;
}
