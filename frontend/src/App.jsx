import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./utils/AuthContext";
import Landing from "./pages/Landing";
import NewConsultation from "./pages/NewConsultation";
import ConsultationDetail from "./pages/ConsultationDetail";
import History from "./pages/History";
import Booking from "./pages/Booking";
import Appointments from "./pages/Appointments";
import Report from "./pages/Report";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import DoctorPortal from "./pages/DoctorPortal";

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function App() {
  const { toast, loading } = useAuth();

  return (
    <div className="app-shell">
      {toast && <div className="toast">{toast}</div>}
      {loading && <div className="loading-ribbon">Syncing profile and history...</div>}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Navigate to="/consult/new" replace />} />
        <Route path="/consult/new" element={<ProtectedRoute><NewConsultation /></ProtectedRoute>} />
        <Route path="/consult/:id" element={<ProtectedRoute><ConsultationDetail /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/booking" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
        <Route path="/report/:id" element={<ProtectedRoute><Report /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/doctor/portal" element={<ProtectedRoute><DoctorPortal /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
