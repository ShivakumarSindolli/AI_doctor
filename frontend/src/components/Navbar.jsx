import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";

export default function Navbar() {
  const { profile, logout, setToast } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");
  const initial = profile?.full_name?.[0] || "D";
  const displayName = profile?.full_name || "Doctor";

  return (
    <nav className="app-navbar">
      <button className="nav-brand" onClick={() => navigate("/consult/new")}>
        <div className="nav-brand-glow" />
        <span className="nav-brand-icon">✦</span>
        <span className="nav-brand-text">MediAI</span>
      </button>

      <div className="nav-center">
        <button className="nav-cta-btn" onClick={() => navigate("/consult/new")}>
          <span className="nav-cta-pulse" />
          <span>＋</span> New Consultation
        </button>
        <button className={`nav-link ${isActive("/history") ? "active" : ""}`} onClick={() => navigate("/history")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
          History
        </button>
        <button className={`nav-link ${isActive("/booking") ? "active" : ""}`} onClick={() => navigate("/booking")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Find Doctors
        </button>

      </div>

      <div className="nav-right">
        <button className="nav-bell" onClick={() => setToast("No new alerts")}>
          🔔
          <span className="nav-bell-badge">2</span>
        </button>
        <div className="nav-user-wrap" ref={dropRef}>
          <button className="nav-user-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <div className="nav-avatar">{initial}</div>
            <span className="nav-user-name">{displayName}</span>
            <span className="nav-chevron">▾</span>
          </button>
          {dropdownOpen && (
            <div className="nav-dropdown">
              <button onClick={() => { navigate("/profile"); setDropdownOpen(false); }}>
                <span className="nav-drop-icon">👤</span> My Profile
              </button>
              <button onClick={() => { navigate("/appointments"); setDropdownOpen(false); }}>
                <span className="nav-drop-icon">📅</span> My Appointments
              </button>
              <button onClick={() => { navigate("/settings"); setDropdownOpen(false); }}>
                <span className="nav-drop-icon">⚙</span> Account Settings
              </button>
              <button onClick={() => { navigate("/history"); setDropdownOpen(false); }}>
                <span className="nav-drop-icon">📋</span> Consultation History
              </button>
              <button onClick={() => { setToast("Help docs coming soon"); setDropdownOpen(false); }}>
                <span className="nav-drop-icon">❓</span> Help & Support
              </button>
              <div className="nav-dropdown-divider" />
              <button className="nav-logout-btn" onClick={() => { logout(); navigate("/"); setDropdownOpen(false); }}>
                <span className="nav-drop-icon">↗</span> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
