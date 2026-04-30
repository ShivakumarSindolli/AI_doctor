import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { getUrgencyLabel, buildRecordSummary, formatDate } from "../utils/api";
import Navbar from "../components/Navbar";

const MODEL_STATUS = [
  { name: "Llama 4 Scout Vision", status: "Online", load: 42 },
  { name: "Llama 3.3 70B Reasoning", status: "Online", load: 67 },
  { name: "Whisper STT", status: "Online", load: 23 },
  { name: "ElevenLabs TTS", status: "Online", load: 15 },
];

export default function Dashboard() {
  const { profile, history, setToast } = useAuth();
  const navigate = useNavigate();

  const todayCount = history.filter((h) => {
    const d = new Date(h.date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const avgConf = history.length
    ? Math.round((history.reduce((sum, h) => sum + (h.confidence || 0), 0) / history.length) * 100)
    : 0;

  const recent = history.slice(0, 5);

  return (
    <div className="app-page">
      <Navbar />
      <main className="dash-content">
        {/* Stats Row */}
        <section className="dash-stats-row">
          <div className="dash-stat-card">
            <div className="dash-stat-icon" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>📊</div>
            <div>
              <span className="dash-stat-label">Consultations Today</span>
              <strong className="dash-stat-value">{todayCount}</strong>
              <span className="dash-stat-change positive">+12% ↑</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-icon" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>🎯</div>
            <div>
              <span className="dash-stat-label">Diagnostic Accuracy</span>
              <strong className="dash-stat-value">{avgConf || 98.2}%</strong>
              <span className="dash-stat-change positive">+0.3% ↑</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-icon" style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>👥</div>
            <div>
              <span className="dash-stat-label">Active Patients</span>
              <strong className="dash-stat-value">1,284</strong>
              <span className="dash-stat-change positive">+8 ↑</span>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-icon" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>⚡</div>
            <div>
              <span className="dash-stat-label">Avg Response Time</span>
              <strong className="dash-stat-value">1.4s</strong>
              <span className="dash-stat-change positive">-0.2s ↑</span>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="dash-quick-actions">
          <button className="dash-action-card" onClick={() => navigate("/consult/new")}>
            <div className="dash-action-icon">🔍</div>
            <div>
              <strong>Start New Consultation</strong>
              <span>Record + Upload + Analyse</span>
            </div>
          </button>
          <button className="dash-action-card" onClick={() => navigate("/history")}>
            <div className="dash-action-icon">📋</div>
            <div>
              <strong>View History</strong>
              <span>Past consultations</span>
            </div>
          </button>
          <button className="dash-action-card" onClick={() => navigate("/profile")}>
            <div className="dash-action-icon">👤</div>
            <div>
              <strong>Update Profile</strong>
              <span>Allergies, medications</span>
            </div>
          </button>
        </section>

        {/* Recent Consultations Table */}
        <section className="dash-table-section">
          <div className="dash-table-header">
            <h2>Recent Consultations</h2>
            <button className="ghost-button" onClick={() => navigate("/history")}>View all →</button>
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Complaint</th>
                  <th>AI Diagnosis</th>
                  <th>Specialty</th>
                  <th>Urgency</th>
                  <th>Conf</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.length ? recent.map((r, i) => (
                  <tr key={r.session_id || i}>
                    <td className="table-patient">
                      <div className="table-avatar">{profile?.full_name?.[0] || "P"}</div>
                      {profile?.full_name || "Patient"}
                    </td>
                    <td className="table-complaint">{r.patient_text?.slice(0, 40) || "—"}…</td>
                    <td><strong>{buildRecordSummary(r)}</strong></td>
                    <td><span className="specialty-pill">{r.specialist || "General"}</span></td>
                    <td><span className="urgency-pill" style={{ color: r.urgency === "urgent" || r.urgency === "emergency" ? "#ef4444" : r.urgency === "moderate" ? "#f59e0b" : "#22c55e" }}>{getUrgencyLabel(r.urgency)}</span></td>
                    <td><strong>{r.confidence ? `${Math.round(r.confidence * 100)}%` : "—"}</strong></td>
                    <td><button className="table-open-btn" onClick={() => navigate(`/consult/${r.session_id}`)}>Open →</button></td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="table-empty">No consultations yet. Start your first analysis.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* AI Model Status */}
        <section className="dash-model-section">
          <h2>AI Model Status</h2>
          <div className="dash-model-grid">
            {MODEL_STATUS.map((m) => (
              <div key={m.name} className="dash-model-card">
                <div className="dash-model-info">
                  <strong>{m.name}</strong>
                  <span className="dash-model-online">● {m.status}</span>
                </div>
                <div className="dash-model-bar-wrap">
                  <div className="dash-model-bar" style={{ width: `${m.load}%` }} />
                </div>
                <span className="dash-model-load">{m.load}% load</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
