/* The logged-in user, kept in the browser by the sign-in page. Same key the dashboard uses. */
export const USER_KEY = "sync_user";
export type SessionUser = { name: string; email: string };
// The load user function
export function loadUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? (JSON.parse(raw) as SessionUser | null) : null;
    return user && typeof user.name === "string" ? user : null;
  } catch {
    return null;
  }
}
