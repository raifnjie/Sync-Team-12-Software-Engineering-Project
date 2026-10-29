import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

/* Where the logged-in user is kept in the browser. The dashboard reads the same key. */
const USER_KEY = "sync_user";
/* Remembers the name typed at sign-up so a later log in can greet the user by name. */
const PROFILES_KEY = "sync_profiles";

/* The three things this page can show */
type Mode = "login" | "signup" | "reset";
type SessionUser = { name: string; email: string };
type FormValues = { name: string; email: string; password: string; confirm: string };
type Errors = Partial<Record<keyof FormValues | "form", string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* The red border shows up only when the field has an error */
function inputClass(hasError: boolean) {
  return (
    "w-full rounded border bg-white px-3 py-2.5 focus:outline-2 focus:outline-brand " +
    (hasError ? "border-red-500" : "border-gray-200 focus:border-brand")
  );
}

/* Safely read JSON from localStorage (returns the fallback if anything goes wrong) */
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadUser(): SessionUser | null {
  const user = readJson<SessionUser | null>(USER_KEY, null);
  return user && typeof user.name === "string" ? user : null;
}

/* "mike.smith@gsu.edu" -> "Mike" (only used when we don't know the user's real name) */
function nameFromEmail(email: string) {
  const first = email.split("@")[0].split(/[._-]/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/* TODO: replace with real calls to the backend:
   POST /api/auth/login, POST /api/auth/register, POST /api/auth/forgot-password */
function fakeRequest() {
  return new Promise<void>((resolve) => setTimeout(resolve, 500));
}

function validate(mode: Mode, v: FormValues): Errors {
  const found: Errors = {};

  if (mode === "signup" && !v.name.trim()) {
    found.name = "Enter your full name.";
  }

  if (!v.email.trim()) {
    found.email = "Enter your email.";
  } else if (!emailPattern.test(v.email.trim())) {
    found.email = "Enter a valid email, like you@gsu.edu.";
  }

  if (mode !== "reset") {
    if (!v.password) {
      found.password = "Enter your password.";
    } else if (mode === "signup" && v.password.length < 8) {
      found.password = "Use at least 8 characters.";
    }
  }

  if (mode === "signup" && v.confirm !== v.password) {
    found.confirm = "Passwords don't match.";
  }

  return found;
}

/* One label + input + error message, so the form below stays short */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-xs text-gray-500">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  // If someone is already logged in, we show "Continue" instead of the form
  const [existing, setExisting] = useState<SessionUser | null>(loadUser);

  const navigate = useNavigate();

  const isSignUp = mode === "signup";
  const isReset = mode === "reset";

  useEffect(() => {
    document.title = (isSignUp ? "Create account" : isReset ? "Reset password" : "Log in") + " · Sync";
  }, [isSignUp, isReset]);

  /* Switch between log in / sign up / reset and start with a clean form */
  function changeMode(next: Mode) {
    setMode(next);
    setErrors({});
    setResetSent(false);
    setPassword("");
    setConfirm("");
    setShowPassword(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const found = validate(mode, { name, email, password, confirm });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await fakeRequest();
      const cleanEmail = email.trim().toLowerCase();

      if (isReset) {
        setResetSent(true);
        return;
      }

      const profiles = readJson<Record<string, string>>(PROFILES_KEY, {});
      let displayName: string;
      if (isSignUp) {
        displayName = name.trim();
        profiles[cleanEmail] = displayName;
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      } else {
        displayName = profiles[cleanEmail] ?? nameFromEmail(cleanEmail);
      }

      localStorage.setItem(USER_KEY, JSON.stringify({ name: displayName, email: cleanEmail }));
      // "replace" so the Back button doesn't send the user back to the log in form
      navigate("/dashboard", { replace: true });
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  function logOut() {
    localStorage.removeItem(USER_KEY);
    setExisting(null);
  }

  const submitLabel = isSignUp ? "Create Account" : isReset ? "Send Reset Link" : "Log In";

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <main className="w-full max-w-75">
        <h1 className="m-0 text-2xl font-bold">Sync</h1>
        <p className="mb-7 mt-0.5 text-xs text-gray-500">
          {/* Slogan for the app */}
          One place, one student, one destination
        </p>

        {existing ? (
          /* Already logged in (for example, after clicking the profile circle in the navbar) */
          <section aria-label="Current session">
            <p className="mb-1 text-sm font-bold">You're signed in as {existing.name}</p>
            <p className="mb-4 text-xs text-gray-500">{existing.email}</p>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="block w-full cursor-pointer rounded bg-brand p-2.5 font-bold text-white hover:bg-brand-dark"
            >
              {/* A way to access the dashboard when the user clicks the login logo */}
              Continue to dashboard
            </button>
            <p className="mt-3.5 text-center text-xs">
              Not you?{" "}
              <button
                type="button"
                onClick={logOut}
                className="cursor-pointer text-brand hover:underline"
              >
                Log out
              </button>
            </p>
          </section>
        ) : (
          <>
            {/* key={mode} gives each mode a fresh form so the first field gets focus */}
            <form key={mode} onSubmit={handleSubmit} noValidate>
              {isReset && (
                <p className="mb-4 text-xs text-gray-500">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              )}

              {errors.form && (
                <p role="alert" className="mb-4 rounded bg-red-50 p-2.5 text-xs text-red-600">
                  {errors.form}
                </p>
              )}

              {resetSent ? (
                <p role="status" className="mb-4 rounded bg-green-50 p-2.5 text-xs text-green-700">
                  If an account exists for {email.trim()}, a reset link is on its way.
                </p>
              ) : (
                <>
                  {isSignUp && (
                    // The user would need to type their full name to create an account
                    <Field id="name" label="Full name" error={errors.name}>
                      <input
                        id="name"
                        type="text"
                        placeholder="Jordan Smith"
                        autoComplete="name"
                        autoFocus
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? "name-error" : undefined}
                        className={inputClass(!!errors.name)}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </Field>
                  )}

                  {/* The email field */}
                  <Field id="email" label="Email" error={errors.email}>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@gsu.edu"
                      autoComplete="email"
                      autoFocus={!isSignUp}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email-error" : undefined}
                      className={inputClass(!!errors.email)}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>

                  {/* The password field */}
                  {!isReset && (
                    <Field id="password" label="Password" error={errors.password}>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="*******"
                          autoComplete={isSignUp ? "new-password" : "current-password"}
                          aria-invalid={!!errors.password}
                          aria-describedby={errors.password ? "password-error" : undefined}
                          className={inputClass(!!errors.password) + " pr-16"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-pressed={showPassword}
                          aria-label="Show password"
                          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs text-gray-500 hover:text-gray-900"
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </Field>
                  )}

                  {isSignUp && (
                    <Field id="confirm" label="Confirm password" error={errors.confirm}>
                      <input
                        id="confirm"
                        type={showPassword ? "text" : "password"}
                        placeholder="*******"
                        autoComplete="new-password"
                        aria-invalid={!!errors.confirm}
                        aria-describedby={errors.confirm ? "confirm-error" : undefined}
                        className={inputClass(!!errors.confirm)}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                      />
                    </Field>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="block w-full cursor-pointer rounded bg-brand p-2.5 font-bold text-white hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
                  >
                    {submitting ? "Please wait..." : submitLabel}
                  </button>
                </>
              )}

              {mode === "login" && (
                <p className="mt-3.5 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => changeMode("reset")}
                    className="cursor-pointer text-brand hover:underline"
                  >
                    Forgot password?
                  </button>
                </p>
              )}
            </form>

            <hr className="my-5 border-0 border-t border-gray-200" />

            <p className="mb-5 text-center text-xs">
              {mode === "login" ? "New here? " : isSignUp ? "Already have an account? " : "Remembered it? "}
              <button
                type="button"
                onClick={() => changeMode(mode === "login" ? "signup" : "login")}
                className="cursor-pointer text-brand hover:underline"
              >
                {mode === "login" ? "Create an account" : isSignUp ? "Log in" : "Back to log in"}
              </button>
            </p>

            <div className="rounded border border-dashed border-gray-300 p-2.5 text-center text-[11px] text-gray-500">
              {/* The role is selected automatically, user doesn't need to choose during login */}
              Role selected automatically: Student &middot; Advisor &middot; Admin
            </div>
          </>
        )}
      </main>
    </div>
  );
}
