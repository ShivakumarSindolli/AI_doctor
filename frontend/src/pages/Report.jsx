import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { buildRecordSummary, formatDate, getUrgencyLabel } from "../utils/api";
import Navbar from "../components/Navbar";

export default function Report() {
  const { id } = useParams();
  const { history, profile } = useAuth();
  const navigate = useNavigate();
  const record = history.find((h) => h.session_id === id);

  if (!record) return (
    <div className="app-page"><Navbar />
      <div className="report-empty"><h2>Report not found</h2><button className="primary-button" onClick={() => navigate("/history")}>Back to History</button></div>
    </div>
  );

  const conf = record.confidence ? Math.round(record.confidence * 100) : 0;
  const differentials = record.diagnosis?.differential_diagnosis || [];
  const redFlags = record.diagnosis?.red_flags || [];
  const treatment = record.diagnosis?.treatment_plan || record.doctor_response || "";
  const vf = record.vision_findings;

  function handlePrint() { window.print(); }

  return (
    <div className="app-page">
      <Navbar />
      <main className="report-page">
        <div className="report-paper" id="report-printable">
          {/* 1. Header */}
          <div className="report-header-section">
            <div className="report-logo"><span className="nav-brand-icon">✦</span> MediAI</div>
            <div className="report-meta">
              <span>Session: {record.session_id?.slice(0, 8)}</span>
              <span>{formatDate(record.date)}</span>
              <span>Doctor: {profile?.full_name || "—"}</span>
            </div>
          </div>

          {/* 2. Patient Summary */}
          <section className="report-section">
            <h3>Patient Summary</h3>
            <div className="report-grid-2">
              <div><span>Name</span><strong>{profile?.full_name || "—"}</strong></div>
              <div><span>Age</span><strong>{profile?.age || "—"}</strong></div>
              <div><span>Gender</span><strong>{profile?.gender || "—"}</strong></div>
              <div><span>Blood Type</span><strong>{profile?.blood_type || "—"}</strong></div>
              <div><span>Allergies</span><strong>{profile?.allergies || "None reported"}</strong></div>
              <div><span>Medications</span><strong>{profile?.medications || "None reported"}</strong></div>
            </div>
          </section>

          {/* 3. Chief Complaint */}
          <section className="report-section">
            <h3>Chief Complaint</h3>
            <p className="report-complaint">"{record.patient_text}"</p>
          </section>

          {/* 4. Image Analysis */}
          {vf && (
            <section className="report-section">
              <h3>Image Analysis</h3>
              <p>{vf.findings || "No specific findings"}</p>
              {vf.abnormalities?.length > 0 && <ul>{vf.abnormalities.map((a, i) => <li key={i}>{a}</li>)}</ul>}
            </section>
          )}

          {/* 5. Primary Diagnosis */}
          <section className="report-section">
            <h3>Primary Diagnosis</h3>
            <div className="report-diagnosis-main">
              <strong>{buildRecordSummary(record)}</strong>
              <div className="report-badges">
                {record.icd_codes && <span className="report-icd">ICD-10: {Array.isArray(record.icd_codes) ? record.icd_codes.join(", ") : record.icd_codes}</span>}
                <span className="report-conf">Confidence: {conf}%</span>
                <span className="report-urgency" data-urgency={record.urgency}>{getUrgencyLabel(record.urgency)}</span>
              </div>
            </div>
          </section>

          {/* 6. Differentials */}
          {differentials.length > 0 && (
            <section className="report-section">
              <h3>Differential Diagnoses</h3>
              <table className="report-table">
                <thead><tr><th>Condition</th><th>Probability</th><th>Reasoning</th></tr></thead>
                <tbody>{differentials.map((d, i) => (
                  <tr key={i}><td>{d.condition}</td><td>{d.likelihood || "—"}</td><td>{d.reasoning || "—"}</td></tr>
                ))}</tbody>
              </table>
            </section>
          )}

          {/* 7. Treatment Plan */}
          <section className="report-section">
            <h3>Treatment Plan</h3>
            <p>{treatment}</p>
          </section>

          {/* 8. Specialist */}
          <section className="report-section">
            <h3>Specialist Routing</h3>
            <p>Specialty: <strong>{record.specialist || "General"}</strong> · Urgency: <strong>{record.urgency || "Routine"}</strong></p>
          </section>

          {/* 9. Safety Flags */}
          {(redFlags.length > 0 || record.flagged) && (
            <section className="report-section report-safety">
              <h3>⚠ Safety Flags</h3>
              {redFlags.map((f, i) => <p key={i}>• {f}</p>)}
              {record.flagged && <p className="report-flagged">Physician Review Required</p>}
            </section>
          )}

          {/* 10. Confidence Score */}
          <section className="report-section">
            <h3>AI Confidence Score</h3>
            <div className="report-gauge">
              <div className="report-gauge-bar"><div style={{ width: `${conf}%` }} /></div>
              <span>{conf}%</span>
              <span className={`report-flag-status ${record.flagged ? "flagged" : "clear"}`}>{record.flagged ? "Physician Review Required" : "Clear"}</span>
            </div>
          </section>

          {/* 11. Disclaimer */}
          <section className="report-disclaimer">
            <p>⚠ This report is generated by MediAI for clinical decision support only. It does not constitute medical advice. Always consult a qualified healthcare professional before making treatment decisions.</p>
          </section>
        </div>

        {/* 12. Action Buttons */}
        <div className="report-actions">
          <button className="primary-button" onClick={handlePrint}>⬇ Download PDF</button>
          <button className="secondary-button" onClick={handlePrint}>🖨 Print</button>
          <button className="secondary-button" onClick={() => navigator.clipboard?.writeText(window.location.href)}>↗ Share</button>
          <button className="ghost-button" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </main>
    </div>
  );
}
