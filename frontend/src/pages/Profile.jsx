import { useState, useEffect } from "react";
import { useAuth } from "../utils/AuthContext";
import { apiFetch, GENDERS, BLOOD_TYPES } from "../utils/api";
import Navbar from "../components/Navbar";

export default function Profile() {
  const { token, profile, setProfile, setToast } = useAuth();
  const [draft, setDraft] = useState({ full_name: "", age: "", gender: "", blood_type: "", allergies: "", medications: "" });

  useEffect(() => {
    if (profile) setDraft({
      full_name: profile.full_name || "", age: profile.age || "", gender: profile.gender || "",
      blood_type: profile.blood_type || "", allergies: profile.allergies || "", medications: profile.medications || "",
    });
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    try {
      const payload = {
        full_name: draft.full_name || null, age: draft.age ? Number(draft.age) : null,
        gender: draft.gender || null, blood_type: draft.blood_type || null,
        allergies: draft.allergies || null, medications: draft.medications || null,
      };
      await apiFetch("/patients/me", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      setProfile((c) => ({ ...c, ...payload }));
      setToast("Profile updated successfully.");
    } catch (err) { setToast(err.message); }
  }

  const completion = profile ? [profile.age, profile.gender, profile.blood_type, profile.allergies, profile.medications].filter(Boolean).length * 20 : 0;

  return (
    <div className="app-page">
      <Navbar />
      <main className="profile-page">
        <h1>My Profile</h1>
        <p className="page-subtitle">Patient demographics, allergies, medications</p>

        <div className="profile-layout">
          {/* Left Column */}
          <div className="profile-col">
            <div className="profile-card">
              <h3>Personal Information</h3>
              <form className="profile-form-grid" onSubmit={handleSave}>
                <div className="pf-field"><label>Full Name</label><input value={draft.full_name} onChange={(e) => setDraft((c) => ({ ...c, full_name: e.target.value }))} /></div>
                <div className="pf-field"><label>Email</label><input value={profile?.email || ""} readOnly className="pf-readonly" /></div>
                <div className="pf-row">
                  <div className="pf-field"><label>Age</label><input type="number" value={draft.age} onChange={(e) => setDraft((c) => ({ ...c, age: e.target.value }))} /></div>
                  <div className="pf-field"><label>Gender</label><select value={draft.gender} onChange={(e) => setDraft((c) => ({ ...c, gender: e.target.value }))}><option value="">Select</option>{GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
                </div>
                <div className="pf-field"><label>Blood Type</label><select value={draft.blood_type} onChange={(e) => setDraft((c) => ({ ...c, blood_type: e.target.value }))}><option value="">Select</option>{BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>

                <div className="pf-section-label">Account</div>
                <div className="pf-info-row"><span>Role</span><strong>Dermatologist</strong></div>
                <div className="pf-info-row"><span>Plan</span><strong>Professional</strong></div>
                <div className="pf-info-row"><span>Member since</span><strong>{profile?.member_since ? new Date(profile.member_since).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}</strong></div>

                <button className="primary-button full" type="submit">Save Profile</button>
              </form>
            </div>
          </div>

          {/* Right Column */}
          <div className="profile-col">
            <div className="profile-card">
              <h3>Medical Context <span className="pf-ai-badge">Used by AI</span></h3>
              <div className="pf-completion">
                <div className="pf-comp-bar"><div style={{ width: `${completion}%` }} /></div>
                <span>{completion}% complete</span>
              </div>
              <form className="profile-form-grid" onSubmit={handleSave}>
                <div className="pf-field"><label>Known Allergies</label><textarea rows="3" value={draft.allergies} onChange={(e) => setDraft((c) => ({ ...c, allergies: e.target.value }))} placeholder="e.g., Penicillin, Sulfa drugs" /></div>
                <div className="pf-field"><label>Current Medications</label><textarea rows="3" value={draft.medications} onChange={(e) => setDraft((c) => ({ ...c, medications: e.target.value }))} placeholder="e.g., Levothyroxine 50mcg" /></div>
                <div className="pf-field"><label>Chronic Conditions</label><input placeholder="e.g., Hypothyroidism" /></div>
                <div className="pf-field"><label>Emergency Contact</label><input placeholder="+1 555 0100" /></div>

                <div className="pf-section-label">Preferences</div>
                <div className="pf-info-row"><span>Language</span><strong>English</strong></div>
                <div className="pf-info-row"><span>TTS Voice</span><strong>Clinical Female (Aria)</strong></div>
                <div className="pf-info-row"><span>Report Format</span><strong>PDF (A4)</strong></div>

                <button className="primary-button full" type="submit">Save Medical Context</button>
              </form>
            </div>

            <div className="profile-card pf-how-card">
              <h4>How Profile Feeds the AI</h4>
              <ul>
                <li>Allergies are cross-checked against every treatment recommendation</li>
                <li>Medications are checked for drug interactions</li>
                <li>Age and gender personalise differential diagnosis probabilities</li>
                <li>Blood type is included in the generated report header</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
