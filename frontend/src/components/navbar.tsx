import { Link, NavLink } from "react-router-dom";

// The links in the top bar. To add a page, add one line here.
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
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-6 py-3.5">
      <Link to="/dashboard" className="text-base font-bold text-gray-900">
        Sync
      </Link>

      <nav
        aria-label="Main"
        className="order-3 flex w-full gap-5 overflow-x-auto md:order-none md:w-auto"
      >
        {links.map((link) => (
          // NavLink tells us if this link matches the current page (isActive)
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              "border-b-2 py-1 text-xs " +
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
        className="block h-8 w-8 rounded-full bg-gray-300"
      />
    </header>
  );
}
