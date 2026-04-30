import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { apiFetch } from "../utils/api";
import Navbar from "../components/Navbar";
import "./DoctorPortal.css";

const SPECIALTIES = [
  "General", "Dermatology", "Cardiology", "Neurology", "Orthopedics",
  "Gastroenterology", "Pulmonology", "Psychiatry", "Ophthalmology",
  "ENT", "Endocrinology", "Urology", "Emergency"
];

export default function DoctorPortal() {
  const { profile, token, appointments, setToast } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("appointments");
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [form, setForm] = useState({ specialty: "", experience: "", hospital: "", fee: "", avatar_url: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!token) return;
    if (profile && profile.role !== "doctor") {
      navigate("/consult/new");
    }
  }, [profile, token, navigate]);

  useEffect(() => {
    if (!token) return;
    apiFetch("/doctors/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        setDoctorProfile(data);
        setForm({
          specialty: data.specialty || "",
          experience: data.experience || "",
          hospital: data.hospital || "",
          fee: data.fee || "",
          avatar_url: data.avatar_url || "",
          bio: data.bio || "",
        });
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false));
  }, [token]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/doctors/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      setToast("Profile updated successfully!");
    } catch (err) {
      setToast(err.message);
    } finally {
      setSaving(false);
    }
  }

  const upcomingAppointments = appointments.filter(a => a.status !== "cancelled");
  const todayStr = new Date().toLocaleDateString("en-CA");
  const todayAppts = upcomingAppointments.filter(a => a.date === todayStr || a.date?.startsWith(todayStr));

  return (
    <div className="app-page">
      <Navbar />
      <main className="dp-page">
        {/* Hero Header */}
        <div className="dp-header">
          <div className="dp-header-content">
            <div className="dp-avatar">
              {form.avatar_url
                ? <img src={form.avatar_url} alt="profile" />
                : <span>{profile?.full_name?.[0] || "D"}</span>
              }
            </div>
            <div>
              <div className="dp-role-badge">Doctor Portal</div>
              <h1>{profile?.full_name || "Doctor"}</h1>
              <p className="dp-email">{profile?.email}</p>
              {doctorProfile && <p className="dp-meta">{doctorProfile.specialty} · {doctorProfile.hospital}</p>}
            </div>
          </div>
          <div className="dp-stats">
            <div className="dp-stat">
              <strong>{upcomingAppointments.length}</strong>
              <span>Total Appointments</span>
            </div>
            <div className="dp-stat">
              <strong>{todayAppts.length}</strong>
              <span>Today</span>
            </div>
            <div className="dp-stat">
              <strong>{doctorProfile?.fee || "—"}</strong>
              <span>Consultation Fee</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="dp-tabs">
          <button className={`dp-tab ${tab === "appointments" ? "active" : ""}`} onClick={() => setTab("appointments")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Appointments
            {upcomingAppointments.length > 0 && <span className="dp-badge">{upcomingAppointments.length}</span>}
          </button>
          <button className={`dp-tab ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Edit Profile
          </button>
        </div>

        <div className="dp-content">
          {/* Appointments Tab */}
          {tab === "appointments" && (
            <div className="dp-appointments">
              {upcomingAppointments.length === 0 ? (
                <div className="dp-empty">
                  <div className="dp-empty-icon">📅</div>
                  <h3>No appointments yet</h3>
                  <p>When patients book with you, they will appear here as real-time notifications.</p>
                </div>
              ) : (
                <div className="dp-apt-grid">
                  {upcomingAppointments.map((apt) => {
                    const isToday = apt.date === todayStr || apt.date?.startsWith(todayStr);
                    return (
                      <div key={apt.id} className={`dp-apt-card ${isToday ? "today" : ""}`}>
                        {isToday && <div className="dp-apt-today-badge">Today</div>}
                        <div className="dp-apt-top">
                          <div className="dp-apt-patient">
                            <div className="dp-apt-avatar">{apt.other_party_name?.[0] || apt.patient?.[0] || "P"}</div>
                            <div>
                              <strong>{apt.other_party_name || apt.patient || "Patient"}</strong>
                              <span>{apt.other_party_email || ""}</span>
                            </div>
                          </div>
                          <div className={`dp-apt-status ${apt.status}`}>{apt.status}</div>
                        </div>
                        <div className="dp-apt-details">
                          <div className="dp-apt-detail">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            {apt.date}
                          </div>
                          <div className="dp-apt-detail">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            {apt.time}
                          </div>
                          {apt.notes && (
                            <div className="dp-apt-detail notes">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              {apt.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Profile Edit Tab */}
          {tab === "profile" && (
            <div className="dp-profile-edit">
              <div className="dp-profile-card">
                <h2>Your Professional Profile</h2>
                <p>This is how you appear on the Find Doctors page to patients.</p>
                {loadingProfile ? (
                  <div className="dp-loading">Loading profile…</div>
                ) : (
                  <form className="dp-form" onSubmit={handleSave}>
                    <div className="dp-form-row">
                      <div className="dp-form-group">
                        <label>Specialty</label>
                        <select value={form.specialty} onChange={(e) => setForm(c => ({ ...c, specialty: e.target.value }))}>
                          {SPECIALTIES.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                        </select>
                      </div>
                      <div className="dp-form-group">
                        <label>Experience</label>
                        <input type="text" placeholder="e.g. 10 yrs" value={form.experience} onChange={(e) => setForm(c => ({ ...c, experience: e.target.value }))} />
                      </div>
                    </div>
                    <div className="dp-form-row">
                      <div className="dp-form-group">
                        <label>Hospital / Clinic</label>
                        <input type="text" placeholder="Hospital or clinic name" value={form.hospital} onChange={(e) => setForm(c => ({ ...c, hospital: e.target.value }))} />
                      </div>
                      <div className="dp-form-group">
                        <label>Consultation Fee</label>
                        <input type="text" placeholder="e.g. ₹500" value={form.fee} onChange={(e) => setForm(c => ({ ...c, fee: e.target.value }))} />
                      </div>
                    </div>
                    <div className="dp-form-group">
                      <label>Profile Photo URL</label>
                      <input type="url" placeholder="https://..." value={form.avatar_url} onChange={(e) => setForm(c => ({ ...c, avatar_url: e.target.value }))} />
                      {form.avatar_url && (
                        <div className="dp-preview-img">
                          <img src={form.avatar_url} alt="preview" onError={(e) => e.target.style.display = "none"} />
                          <span>Preview</span>
                        </div>
                      )}
                    </div>
                    <div className="dp-form-group">
                      <label>Bio / About</label>
                      <textarea rows="4" placeholder="Tell patients about your background, expertise, and approach…" value={form.bio} onChange={(e) => setForm(c => ({ ...c, bio: e.target.value }))} />
                    </div>
                    <button type="submit" className="primary-button" disabled={saving}>
                      {saving ? "Saving…" : "Save Profile"}
                    </button>
                  </form>
                )}
              </div>

              {/* Live Preview Card */}
              <div className="dp-preview-card-wrap">
                <h3>Live Preview</h3>
                <p>How your card looks to patients</p>
                <div className="dp-preview-card">
                  <div className="dp-preview-img-wrap">
                    {form.avatar_url
                      ? <img src={form.avatar_url} alt="preview" onError={(e) => e.target.style.display="none"} />
                      : <div className="dp-preview-img-fallback">{profile?.full_name?.[0] || "D"}</div>
                    }
                  </div>
                  <div className="dp-preview-body">
                    <strong className="dp-preview-name">{profile?.full_name || "Dr. Your Name"}</strong>
                    <span className="dp-preview-title">{form.specialty || "Specialist"}</span>
                    <div className="dp-preview-tags">
                      <span className="bkp-tag specialty">{form.specialty || "general"}</span>
                      <span className="bkp-tag rating">⭐ 4.8</span>
                    </div>
                    <div className="dp-preview-details">
                      <span>🏥 {form.hospital || "MediAI Clinic"}</span>
                      <span>💼 {form.experience || "0 yrs"}</span>
                    </div>
                  </div>
                  <div className="dp-preview-price">
                    <strong>{form.fee || "₹0"}</strong>
                    <span>per visit</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
