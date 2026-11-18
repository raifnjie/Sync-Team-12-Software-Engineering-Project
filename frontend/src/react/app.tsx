import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import SignInPage from "../pages/signinpage";
import DashboardPage from "../pages/dashboardpage";
import TimelinePage from "../pages/timelinepage";
import RecommendationsPage from "../pages/recommendationspage";
import ProgressPage from "../pages/progresspage";
import MapPage from "../pages/mappage";
import PlanPage from "../pages/planpage";
import RecsPage from "../pages/recspage";

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
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/recs" element={<RecsPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="*" element={<ComingSoon />} />
      </Routes>
    </BrowserRouter>
  );
}
