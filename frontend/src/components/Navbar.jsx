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

  const isActive = (path) => location.pathname === path;
  const initial = profile?.full_name?.[0] || "D";
  const displayName = profile?.full_name || "Doctor";

  return (
    <nav className="app-navbar">
      <button className="nav-brand" onClick={() => navigate("/dashboard")}>
        <span className="nav-brand-icon">✦</span>
        <span className="nav-brand-text">MediAI</span>
      </button>

      <div className="nav-center">
        <button className={`nav-link ${isActive("/dashboard") ? "active" : ""}`} onClick={() => navigate("/dashboard")}>
          Dashboard
        </button>
        <button className="nav-cta-btn" onClick={() => navigate("/consult/new")}>
          <span>＋</span> New Consultation
        </button>
        <button className={`nav-link ${isActive("/history") ? "active" : ""}`} onClick={() => navigate("/history")}>
          History
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
              <button onClick={() => { navigate("/profile"); setDropdownOpen(false); }}>👤 My Profile</button>
              <button onClick={() => { navigate("/settings"); setDropdownOpen(false); }}>⚙ Account Settings</button>
              <button onClick={() => { navigate("/history"); setDropdownOpen(false); }}>📋 Consultation History</button>
              <button onClick={() => { setToast("Help docs coming soon"); setDropdownOpen(false); }}>❓ Help & Support</button>
              <div className="nav-dropdown-divider" />
              <button className="nav-logout-btn" onClick={() => { logout(); navigate("/"); setDropdownOpen(false); }}>
                ↗ Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
