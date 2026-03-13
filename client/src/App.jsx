import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AnimatePresence } from "framer-motion";

// all Pages 
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import UserDashboard from "./pages/UserDashboard";
import VerifyFace from "./pages/VerifyFace";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSettings from "./pages/admin/AdminSettings";
import MembershipPage from "./pages/onboarding/MembershipPage";
import PaymentPage from "./pages/onboarding/PaymentPage";
import FaceRegistrationPage from "./pages/onboarding/FaceRegistrationPage";

// Layouts
import AdminLayout from "./components/layout/AdminLayout";

// Loading screen
function FullScreenLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-void">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blood border-t-transparent" />
    </div>
  );
}

// Route guards
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
}

function GuestRoute({ children }) {
  const { isAuthenticated, loading, getOnboardingRedirect } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (isAuthenticated) return <Navigate to={getOnboardingRedirect()} replace />;
  return children;
}

function MembershipRoute({ children }) {
  const { isAuthenticated, loading, dbUser } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function ProfileCompleteRoute({ children }) {
  const { isAuthenticated, loading, dbUser } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Require active membership and face registration for protected features
  if (dbUser?.paymentStatus !== "active") return <Navigate to="/dashboard" replace />;
  if (!dbUser?.faceRegistered) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Guest-only (redirect if already logged in) */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Profile completion */}
        <Route path="/complete-profile" element={<PrivateRoute><CompleteProfilePage /></PrivateRoute>} />

        {/* Onboarding flow */}
        <Route path="/onboarding/membership" element={<PrivateRoute><MembershipPage /></PrivateRoute>} />
        <Route path="/onboarding/payment" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
        <Route path="/onboarding/face-registration" element={<PrivateRoute><FaceRegistrationPage /></PrivateRoute>} />

        {/* Authenticated user */}
        <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
        <Route path="/verify" element={<ProfileCompleteRoute><VerifyFace /></ProfileCompleteRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
