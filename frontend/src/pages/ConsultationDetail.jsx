import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { buildRecordSummary, formatDate, getUrgencyLabel, getAudioUrl, likelihoodToPercent } from "../utils/api";
import Navbar from "../components/Navbar";

export default function ConsultationDetail() {
  const { id } = useParams();
  const { history, profile } = useAuth();
  const navigate = useNavigate();
  const record = history.find((h) => h.session_id === id);

  if (!record) return (
    <div className="app-page"><Navbar />
      <div className="report-empty"><h2>Consultation not found</h2><button className="primary-button" onClick={() => navigate("/history")}>Back to History</button></div>
    </div>
  );

  const conf = record.confidence ? Math.round(record.confidence * 100) : 0;
  const differentials = record.diagnosis?.differential_diagnosis || [];
  const vf = record.vision_findings;
  const audioUrl = record.audio_player_url || getAudioUrl(record);

  return (
    <div className="app-page">
      <Navbar />
      <main className="detail-page">
        <div className="detail-header">
          <div>
            <h1>{buildRecordSummary(record)}</h1>
            <p>Session #{record.session_id?.slice(0, 8)} · {formatDate(record.date)} · {record.specialist || "General"}</p>
          </div>
          <div className="detail-actions">
            <button className="primary-button" onClick={() => navigate(`/report/${record.session_id}`)}>📄 Generate Report</button>
            <button className="ghost-button" onClick={() => navigate(-1)}>← Back</button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-col-main">
            {/* Transcript */}
            <div className="detail-card">
              <h3>🎙 Voice Transcript</h3>
              <blockquote>"{record.patient_text}"</blockquote>
              <span className="detail-meta">Diagnosis Confidence · {conf}%</span>
            </div>

            {/* Vision */}
            {vf && (
              <div className="detail-card">
                <h3>🔍 Visual Findings</h3>
                <p>{vf.findings || "No specific findings"}</p>
                {vf.abnormalities?.length > 0 && <ul>{vf.abnormalities.map((a, i) => <li key={i}>{a}</li>)}</ul>}
                {vf.severity && <p>Severity: <strong>{vf.severity}</strong></p>}
              </div>
            )}

            {/* Diagnosis */}
            <div className="detail-card">
              <h3>📊 Diagnosis</h3>
              <div className="detail-primary-diag">
                <strong>{differentials[0]?.condition || buildRecordSummary(record)}</strong>
                <span className="diag-urgency-pill" data-urgency={record.urgency}>{getUrgencyLabel(record.urgency)}</span>
              </div>
              {differentials.length > 0 && (
                <div className="detail-diffs">{differentials.map((d, i) => (
                  <div key={i} className="diff-item">
                    <span>{d.condition}</span>
                    <div className="diff-bar"><div style={{ width: `${likelihoodToPercent(d.likelihood)}%` }} /></div>
                    <span className="diff-pct">{likelihoodToPercent(d.likelihood)}%</span>
                  </div>
                ))}</div>
              )}
            </div>

            {/* Treatment */}
            <div className="detail-card">
              <h3>💊 Treatment Plan</h3>
              <p>{record.doctor_response}</p>
            </div>
          </div>

          <div className="detail-col-side">
            <div className="detail-card">
              <h3>Patient Info</h3>
              <div className="detail-info-grid">
                <div><span>Name</span><strong>{profile?.full_name || "—"}</strong></div>
                <div><span>Age</span><strong>{profile?.age || "—"}</strong></div>
                <div><span>Blood Type</span><strong>{profile?.blood_type || "—"}</strong></div>
                <div><span>Allergies</span><strong>{profile?.allergies || "None"}</strong></div>
              </div>
            </div>

            <div className="detail-card">
              <h3>Metrics</h3>
              <div className="detail-info-grid">
                <div><span>Confidence</span><strong>{conf}%</strong></div>
                <div><span>Urgency</span><strong>{record.urgency || "Routine"}</strong></div>
                <div><span>Safety</span><strong>{record.flagged ? "⚠ Flagged" : "✓ Clear"}</strong></div>
                <div><span>ICD Codes</span><strong>{Array.isArray(record.icd_codes) ? record.icd_codes.join(", ") : record.icd_codes || "—"}</strong></div>
              </div>
            </div>

            {audioUrl && (
              <div className="detail-card">
                <h3>🔊 Voice Response</h3>
                <audio controls src={audioUrl} className="detail-audio" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
