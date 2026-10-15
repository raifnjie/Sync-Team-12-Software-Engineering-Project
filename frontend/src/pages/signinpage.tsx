import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

// One shared style for all three text boxes
const inputClass =
  "w-full rounded border border-gray-200 bg-white px-3 py-2.5 focus:border-brand focus:outline-2 focus:outline-brand";

export default function SignInPage() {
  // State = values React remembers. When they change, the page updates.
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate(); // lets us change pages with code

  function handleSubmit(e: FormEvent) {
    e.preventDefault(); // stop the browser from reloading the page
    // Later: send { name, email, password } to the backend here.
    navigate("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <main className="w-full max-w-75">
        <h1 className="m-0 text-2xl font-bold">Sync</h1>
        <p className="mb-7 mt-0.5 text-xs text-gray-500">
          One place, one student, one destination
        </p>

        <form onSubmit={handleSubmit}>
          {/* Only shows when isSignUp is true */}
          {isSignUp && (
            <div className="mb-4">
              <label htmlFor="name" className="mb-1 block text-xs text-gray-500">
                Full name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Jordan Smith"
                autoComplete="name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="mb-1 block text-xs text-gray-500">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@gsu.edu"
              autoComplete="email"
              required
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="mb-1 block text-xs text-gray-500">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="*******"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="block w-full cursor-pointer rounded bg-brand p-2.5 font-bold text-white hover:bg-brand-dark"
          >
            {isSignUp ? "Create Account" : "Log In"}
          </button>

          {!isSignUp && (
            <p className="mt-3.5 text-center text-xs">
              <a href="#" className="text-brand hover:underline">
                Forgot password?
              </a>
            </p>
          )}
        </form>

        <hr className="my-5 border-0 border-t border-gray-200" />

        <p className="mb-5 text-center text-xs">
          {isSignUp ? "Already have an account? " : "New here? "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="cursor-pointer text-brand hover:underline"
          >
            {isSignUp ? "Log in" : "Create an account"}
          </button>
        </p>

        <div className="rounded border border-dashed border-gray-300 p-2.5 text-center text-[11px] text-gray-500">
          Role selected automatically: Student &middot; Advisor &middot; Admin
        </div>
      </main>
    </div>
  );
}
