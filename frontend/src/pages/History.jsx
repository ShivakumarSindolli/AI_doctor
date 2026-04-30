import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { buildRecordSummary, getUrgencyLabel, formatDate } from "../utils/api";
import Navbar from "../components/Navbar";

const FILTERS = ["All", "Urgent", "Flagged", "This Week", "Dermatology", "Cardiology", "Neurology", "General"];

export default function History() {
  const { history } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [page, setPage] = useState(1);
  const perPage = 6;

  const filtered = useMemo(() => {
    let items = [...history];
    const term = search.trim().toLowerCase();
    if (term) items = items.filter((h) => `${h.patient_text} ${h.specialist} ${buildRecordSummary(h)}`.toLowerCase().includes(term));
    if (activeFilter === "Urgent") items = items.filter((h) => h.urgency === "urgent" || h.urgency === "emergency");
    else if (activeFilter === "Flagged") items = items.filter((h) => h.flagged);
    else if (activeFilter === "This Week") {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      items = items.filter((h) => new Date(h.date) >= weekAgo);
    } else if (activeFilter !== "All") items = items.filter((h) => (h.specialist || "").toLowerCase() === activeFilter.toLowerCase());
    return items;
  }, [history, search, activeFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="app-page">
      <Navbar />
      <main className="history-page">
        <div className="history-header">
          <div>
            <h1>Consultation History</h1>
            <p>All your past AI consultations</p>
          </div>
        </div>

        <div className="history-controls">
          <input className="history-search" type="text" placeholder="Search by symptom or patient name…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <div className="history-filters">
            {FILTERS.map((f) => (
              <button key={f} className={`filter-pill ${activeFilter === f ? "active" : ""}`} onClick={() => { setActiveFilter(f); setPage(1); }}>{f}</button>
            ))}
          </div>
        </div>

        <div className="history-cards">
          {paged.length ? paged.map((r) => {
            const conf = r.confidence ? Math.round(r.confidence * 100) : 0;
            return (
              <div key={r.session_id} className="history-card">
                <div className="hc-top">
                  <span className="hc-session">Session #{r.session_id?.slice(0, 8)}</span>
                  <span className="hc-date">{formatDate(r.date)}</span>
                </div>
                <div className="hc-badges">
                  <span className="hc-urgency" data-urgency={r.urgency}>{getUrgencyLabel(r.urgency)}</span>
                  <span className="hc-conf">{conf}% confidence</span>
                  {r.flagged && <span className="hc-flag">⚑ Flagged</span>}
                </div>
                <div className="hc-complaint">
                  <strong>Chief Complaint:</strong> "{r.patient_text?.slice(0, 120) || "N/A"}…"
                </div>
                <div className="hc-diagnosis">
                  <strong>Diagnosis:</strong> {buildRecordSummary(r)} · {r.specialist || "General"}
                  {r.icd_codes && <span className="hc-icd">ICD-10: {Array.isArray(r.icd_codes) ? r.icd_codes.join(", ") : r.icd_codes}</span>}
                </div>
                <div className="hc-actions">
                  <button className="primary-button" onClick={() => navigate(`/consult/${r.session_id}`)}>View Consultation</button>
                  <button className="secondary-button" onClick={() => navigate(`/report/${r.session_id}`)}>Download Report</button>
                </div>
              </div>
            );
          }) : (
            <div className="history-empty">
              <p>No consultations yet. Start your first analysis.</p>
              <button className="primary-button" onClick={() => navigate("/consult/new")}>Start Consultation</button>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="history-pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>« Previous</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} className={page === i + 1 ? "active" : ""} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next »</button>
          </div>
        )}
      </main>
    </div>
  );
}
