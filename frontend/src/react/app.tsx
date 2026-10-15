import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import SignInPage from "../pages/signinpage";
import DashboardPage from "../pages/dashboardpage";

// Shown for pages we have not built yet (Progress, Map, Plan...)
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

// The router decides which page to show based on the URL
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<SignInPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<ComingSoon />} />
      </Routes>
    </BrowserRouter>
  );
}
