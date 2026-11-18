import { Link, NavLink } from "react-router-dom";

/* The Navigation bar links */
const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/progress", label: "Progress" },
  { to: "/map", label: "Map" },
  { to: "/plan", label: "Plan" },
  { to: "/recs", label: "Recs" },
  { to: "/timeline", label: "Timeline" },
];

export default function Navbar() {
  return (
    
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-3.5">
      {/* The app name */}
      <Link to="/dashboard" className="text-base font-bold text-gray-900">
        Sync
      </Link>

      <nav
        aria-label="Main"
        className="order-3 flex w-full gap-5 overflow-x-auto md:order-none md:w-auto"
      >
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              "shrink-0 whitespace-nowrap border-b-2 py-2 text-sm md:py-1 md:text-xs " +
              (isActive
                ? "border-brand font-bold text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-900")
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <Link
        to="/login"
        aria-label="Account (log out)"
        className="block h-9 w-9 rounded-full bg-gray-300 md:h-8 md:w-8"
      />
    </header>
  );
}
