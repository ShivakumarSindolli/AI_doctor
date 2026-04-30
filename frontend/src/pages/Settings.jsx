import { useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../utils/AuthContext";

const TABS = ["Account", "Notifications", "AI Preferences", "Report Settings", "Privacy & Data", "Billing"];

export default function Settings() {
  const { profile, setToast } = useAuth();
  const [activeTab, setActiveTab] = useState("Account");

  return (
    <div className="app-page">
      <Navbar />
      <main className="settings-page">
        <h1>Settings</h1>
        <p className="page-subtitle">Account, notifications, preferences</p>

        <div className="settings-layout">
          <nav className="settings-tabs">
            {TABS.map((t) => (
              <button key={t} className={`settings-tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>{t}</button>
            ))}
          </nav>

          <div className="settings-content">
            {activeTab === "Account" && (
              <div className="settings-card">
                <h3>Account Settings</h3>
                <div className="settings-form">
                  <div className="sf-field"><label>Email</label><input type="email" defaultValue={profile?.email || ""} /></div>
                  <div className="sf-field"><label>Current Password</label><input type="password" placeholder="Enter current password" /></div>
                  <div className="sf-field"><label>New Password</label><input type="password" placeholder="Enter new password" /></div>
                  <div className="sf-field"><label>Profile Photo</label>
                    <div className="sf-photo-upload">
                      <div className="sf-avatar">{profile?.full_name?.[0] || "D"}</div>
                      <button className="secondary-button" onClick={() => setToast("Photo upload coming soon")}>Change Photo</button>
                    </div>
                  </div>
                  <button className="primary-button" onClick={() => setToast("Settings saved")}>Save Changes</button>
                </div>
              </div>
            )}

            {activeTab === "Notifications" && (
              <div className="settings-card">
                <h3>Notification Preferences</h3>
                <div className="settings-toggles">
                  <div className="sf-toggle"><span>Email alerts for flagged consultations</span><input type="checkbox" defaultChecked /></div>
                  <div className="sf-toggle"><span>Safety warning notifications</span><input type="checkbox" defaultChecked /></div>
                  <div className="sf-toggle"><span>Weekly digest reports</span><input type="checkbox" /></div>
                  <div className="sf-toggle"><span>New feature announcements</span><input type="checkbox" defaultChecked /></div>
                </div>
                <button className="primary-button" onClick={() => setToast("Notification preferences saved")}>Save</button>
              </div>
            )}

            {activeTab === "AI Preferences" && (
              <div className="settings-card">
                <h3>AI Preferences</h3>
                <div className="settings-form">
                  <div className="sf-field"><label>Default TTS Voice</label>
                    <select defaultValue="aria"><option value="aria">Clinical Female (Aria)</option><option value="adam">Clinical Male (Adam)</option></select>
                  </div>
                  <div className="sf-field"><label>Response Language</label>
                    <select defaultValue="en"><option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option></select>
                  </div>
                  <div className="sf-field"><label>Confidence Threshold Override</label><input type="number" defaultValue="70" min="0" max="100" /><span className="sf-hint">Minimum confidence % before flagging</span></div>
                  <button className="primary-button" onClick={() => setToast("AI preferences saved")}>Save</button>
                </div>
              </div>
            )}

            {activeTab === "Report Settings" && (
              <div className="settings-card">
                <h3>Report Settings</h3>
                <div className="settings-form">
                  <div className="sf-field"><label>Clinic Name</label><input defaultValue="MediAI Clinical Center" /></div>
                  <div className="sf-field"><label>Logo URL</label><input placeholder="https://..." /></div>
                  <div className="sf-field"><label>Footer Text</label><textarea rows="2" defaultValue="This report is for clinical decision support only." /></div>
                  <button className="primary-button" onClick={() => setToast("Report settings saved")}>Save</button>
                </div>
              </div>
            )}

            {activeTab === "Privacy & Data" && (
              <div className="settings-card">
                <h3>Privacy & Data</h3>
                <div className="settings-form">
                  <button className="secondary-button" onClick={() => setToast("Data export started")}>⬇ Download Your Data</button>
                  <button className="ghost-button danger" onClick={() => setToast("This action requires confirmation")}>🗑 Delete Consultation History</button>
                </div>
              </div>
            )}

            {activeTab === "Billing" && (
              <div className="settings-card">
                <h3>Billing & Plan</h3>
                <div className="sf-plan-card">
                  <div><strong>Professional Plan</strong><span>₹49/month</span></div>
                  <div className="sf-usage"><span>Usage this month: 24 / 500 consultations</span><div className="sf-usage-bar"><div style={{ width: "4.8%" }} /></div></div>
                  <button className="secondary-button" onClick={() => setToast("Plan management coming soon")}>Upgrade Plan</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
