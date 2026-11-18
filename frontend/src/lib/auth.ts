import { apiFetch, clearSession, saveSession, type SessionUser } from "./api";

/* Log in, sign up, and log out. A successful login or sign-up saves the session. */

type SessionResponse = { token: string; user: SessionUser };

export async function login(email: string, password: string): Promise<SessionUser> {
  const res = await apiFetch<SessionResponse>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    { auth: false }
  );
  saveSession(res.token, res.user);
  return res.user;
}

export async function register(name: string, email: string, password: string): Promise<SessionUser> {
  const res = await apiFetch<SessionResponse>(
    "/api/auth/register",
    { method: "POST", body: JSON.stringify({ name, email, password }) },
    { auth: false }
  );
  saveSession(res.token, res.user);
  return res.user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiFetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }, { auth: false });
}

export function logout(): void {
  clearSession();
}
