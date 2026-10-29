import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import SignInPage from "../pages/signinpage";
import DashboardPage from "../pages/dashboardpage";
import TimelinePage from "../pages/timelinepage";

// The default result on every page not currently built out.
function ComingSoon() {
  return (
    <div className="p-6">
      <p className="mb-2">This page is coming soon.</p>
      <Link to="/dashboard" className="text-brand hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<SignInPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="*" element={<ComingSoon />} />
      </Routes>
    </BrowserRouter>
  );
}
