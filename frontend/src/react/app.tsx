import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import SignInPage from "../pages/signinpage";
import DashboardPage from "../pages/dashboardpage";
import ProgressPage from "../pages/progresspage";
import MapPage from "../pages/mappage";

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
// The App function
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<SignInPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="*" element={<ComingSoon />} />
      </Routes>
    </BrowserRouter>
  );
}
