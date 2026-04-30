import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { formatDate } from "../utils/api";
import Navbar from "../components/Navbar";

export default function Appointments() {
  const { appointments, cancelAppointment, setToast } = useAuth();
  const navigate = useNavigate();

  const upcoming = appointments.filter((a) => a.status === "confirmed");
  const cancelled = appointments.filter((a) => a.status === "cancelled");

  return (
    <div className="app-page">
      <Navbar />
      <main className="appt-page">
        <div className="appt-header">
          <div>
            <h1>My Appointments</h1>
            <p className="page-subtitle">Specialist appointments booked by AI based on your diagnoses</p>
          </div>
          <button className="primary-button" onClick={() => navigate("/consult/new")}>＋ New Consultation</button>
        </div>

        {upcoming.length === 0 && cancelled.length === 0 ? (
          <div className="appt-empty">
            <div className="appt-empty-icon">📅</div>
            <h3>No Appointments Yet</h3>
            <p>After a consultation, MediAI will suggest a specialist and you can book an appointment directly.</p>
            <button className="primary-button" onClick={() => navigate("/consult/new")}>Start a Consultation</button>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="appt-section">
                <h2>Upcoming Appointments <span className="appt-count">{upcoming.length}</span></h2>
                <div className="appt-grid">
                  {upcoming.map((a) => (
                    <div key={a.id} className="appt-card">
                      <div className="appt-card-status confirmed">
                        <span className="appt-status-dot" />Confirmed
                      </div>
                      <div className="appt-card-top">
                        <div className="appt-doc-avatar">{a.doctor.avatar}</div>
                        <div className="appt-doc-info">
                          <strong>{a.doctor.name}</strong>
                          <span>{a.doctor.title}</span>
                        </div>
                      </div>
                      <div className="appt-card-details">
                        <div className="appt-detail-row">
                          <span className="appt-detail-icon">📅</span>
                          <div><span>Date</span><strong>{a.date}</strong></div>
                        </div>
                        <div className="appt-detail-row">
                          <span className="appt-detail-icon">🕐</span>
                          <div><span>Time</span><strong>{a.time}</strong></div>
                        </div>
                        <div className="appt-detail-row">
                          <span className="appt-detail-icon">🏥</span>
                          <div><span>Hospital</span><strong>{a.doctor.hospital}</strong></div>
                        </div>
                        <div className="appt-detail-row">
                          <span className="appt-detail-icon">🩺</span>
                          <div><span>For</span><strong>{a.diagnosis}</strong></div>
                        </div>
                        <div className="appt-detail-row">
                          <span className="appt-detail-icon">💰</span>
                          <div><span>Fee</span><strong>{a.doctor.fee}</strong></div>
                        </div>
                      </div>
                      <div className="appt-card-actions">
                        <button className="secondary-button" onClick={() => navigate(`/report/${a.sessionId}`)}>View Report</button>
                        <button className="ghost-button danger" onClick={() => { cancelAppointment(a.id); setToast("Appointment cancelled."); }}>Cancel</button>
                      </div>
                      <div className="appt-card-footer">
                        <span>Booked {formatDate(a.bookedAt)}</span>
                        <span>Session #{a.sessionId?.slice(0, 8)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {cancelled.length > 0 && (
              <section className="appt-section">
                <h2>Cancelled <span className="appt-count muted">{cancelled.length}</span></h2>
                <div className="appt-grid">
                  {cancelled.map((a) => (
                    <div key={a.id} className="appt-card cancelled">
                      <div className="appt-card-status cancelled-status">
                        <span className="appt-status-dot cancelled-dot" />Cancelled
                      </div>
                      <div className="appt-card-top">
                        <div className="appt-doc-avatar muted">{a.doctor.avatar}</div>
                        <div className="appt-doc-info">
                          <strong>{a.doctor.name}</strong>
                          <span>{a.doctor.title}</span>
                        </div>
                      </div>
                      <div className="appt-card-details">
                        <div className="appt-detail-row"><span className="appt-detail-icon">📅</span><div><span>Date</span><strong>{a.date}</strong></div></div>
                        <div className="appt-detail-row"><span className="appt-detail-icon">🩺</span><div><span>For</span><strong>{a.diagnosis}</strong></div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
