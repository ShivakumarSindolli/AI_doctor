import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { SPECIALISTS, generateTimeSlots, uid, buildRecordSummary } from "../utils/api";
import Navbar from "../components/Navbar";
import { X } from "lucide-react";

const ALL_SPECIALTIES = Object.keys(SPECIALISTS);
const ALL_DOCTORS = ALL_SPECIALTIES.flatMap((s) => SPECIALISTS[s].map((d) => ({ ...d, specialty: s })));

const DOCTOR_IMAGES = {
  "dr-1": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
  "dr-2": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80",
  "dr-3": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
  "dr-4": "https://images.unsplash.com/photo-1594824476967-48c8b964d31e?auto=format&fit=crop&w=400&q=80",
  "dr-5": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
  "dr-6": "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=400&q=80",
  "dr-7": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80",
  "dr-8": "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=400&q=80",
  "dr-9": "https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=400&q=80",
  "dr-10": "https://images.unsplash.com/photo-1618498082410-b4aa22193b38?auto=format&fit=crop&w=400&q=80",
  "dr-11": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80",
  "dr-12": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
  "dr-13": "https://images.unsplash.com/photo-1594824476967-48c8b964d31e?auto=format&fit=crop&w=400&q=80",
  "dr-14": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
  "dr-15": "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=400&q=80",
  "dr-16": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80",
  "dr-17": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
  "dr-18": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80",
  "dr-19": "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=400&q=80",
  "dr-20": "https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=400&q=80",
  "dr-21": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80",
  "dr-22": "https://images.unsplash.com/photo-1618498082410-b4aa22193b38?auto=format&fit=crop&w=400&q=80",
};

export default function Booking() {
  const { profile, addAppointment, setToast, history, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dynamicDoctors, setDynamicDoctors] = useState([]);

  useEffect(() => {
    import("../utils/api").then(({ apiFetch }) => {
      apiFetch("/doctors").then(setDynamicDoctors).catch(console.error);
    });
  }, []);

  // Pre-select specialty if coming from consultation
  const params = new URLSearchParams(location.search);
  const preSpecialty = params.get("specialty") || "";
  const preSessionId = params.get("session") || "";
  const preRecord = preSessionId ? history.find((h) => h.session_id === preSessionId) : null;

  const [activeFilter, setActiveFilter] = useState(preSpecialty || "all");
  const [search, setSearch] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingDone, setBookingDone] = useState(null);

  const timeSlots = useMemo(() => generateTimeSlots(), [selectedDoctor]);

  const combinedDoctors = useMemo(() => {
    return [...ALL_DOCTORS, ...dynamicDoctors];
  }, [dynamicDoctors]);

  const filtered = useMemo(() => {
    let docs = activeFilter === "all" ? combinedDoctors : combinedDoctors.filter((d) => d.specialty === activeFilter);
    const term = search.trim().toLowerCase();
    if (term) docs = docs.filter((d) => `${d.name} ${d.title} ${d.hospital} ${d.specialty}`.toLowerCase().includes(term));
    return docs;
  }, [activeFilter, search, combinedDoctors]);

  async function handleBook() {
    if (!selectedDoctor || !selectedDate || !selectedTime) { setToast("Select a doctor, date, and time."); return; }
    setBookingLoading(true);
    
    if (selectedDoctor.db_id && token) {
      try {
        const { apiFetch } = await import("../utils/api");
        await apiFetch("/appointments/", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            doctor_id: selectedDoctor.db_id,
            date: selectedDate.date,
            time: selectedTime,
            notes: preRecord ? buildRecordSummary(preRecord) : "General Consultation"
          })
        });
      } catch (err) {
        console.error("Failed to sync appointment with DB", err);
      }
    }
    setTimeout(() => {
      const appt = {
        id: uid(),
        sessionId: preSessionId || null,
        doctor: selectedDoctor,
        date: selectedDate.date,
        dateISO: selectedDate.dateISO,
        time: selectedTime,
        specialty: selectedDoctor.specialty,
        diagnosis: preRecord ? buildRecordSummary(preRecord) : "General Consultation",
        patient: profile?.full_name || "Patient",
        status: "confirmed",
        bookedAt: new Date().toISOString(),
        urgency: preRecord?.urgency || "routine",
        confidence: preRecord?.confidence || null,
      };
      addAppointment(appt);
      setBookingDone(appt);
      setBookingLoading(false);
      setToast("✅ Appointment booked successfully!");
    }, 2200);
  }

  function resetBooking() {
    setSelectedDoctor(null); setSelectedDate(null); setSelectedTime(null); setBookingDone(null);
  }

  return (
    <div className="app-page">
      <Navbar />
      <main className="booking-page">
        {/* Header */}
        <div className="bkp-header">
          <div>
            <h1>Find & Book Specialists</h1>
            <p className="page-subtitle">Browse our verified specialist network and book appointments instantly</p>
          </div>
          {preRecord && (
            <div className="bkp-context-badge">
              <span>🩺</span> Booking for: <strong>{buildRecordSummary(preRecord)}</strong>
            </div>
          )}
        </div>

        {/* Search & Filters */}
        <div className="bkp-controls">
          <div className="bkp-search-wrap">
            <svg className="bkp-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input className="bkp-search" type="text" placeholder="Search by name, specialty, or hospital…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="bkp-filters">
            <button className={`bkp-filter ${activeFilter === "all" ? "active" : ""}`} onClick={() => setActiveFilter("all")}>All Specialists</button>
            {ALL_SPECIALTIES.map((s) => (
              <button key={s} className={`bkp-filter ${activeFilter === s ? "active" : ""}`} onClick={() => setActiveFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Booking Done State */}
        {bookingDone ? (
          <div className="bkp-confirmed">
            <div className="bkp-confirmed-check">✓</div>
            <h2>Appointment Confirmed!</h2>
            <p>AI has booked your specialist appointment successfully.</p>
            <div className="bkp-confirmed-details">
              <div><span>🩺 Doctor</span><strong>{bookingDone.doctor.name}</strong></div>
              <div><span>📅 Date</span><strong>{bookingDone.date}</strong></div>
              <div><span>🕐 Time</span><strong>{bookingDone.time}</strong></div>
              <div><span>🏥 Hospital</span><strong>{bookingDone.doctor.hospital}</strong></div>
              <div><span>💰 Fee</span><strong>{bookingDone.doctor.fee}</strong></div>
              <div><span>📋 For</span><strong>{bookingDone.diagnosis}</strong></div>
            </div>
            <div className="bkp-confirmed-actions">
              <button className="primary-button" onClick={() => navigate("/appointments")}>View My Appointments</button>
              {preSessionId && <button className="secondary-button" onClick={() => navigate(`/report/${preSessionId}`)}>View Report</button>}
              <button className="ghost-button" onClick={resetBooking}>Book Another</button>
            </div>
          </div>
        ) : (
          <div className="bkp-layout">
            {/* Doctor Cards */}
            <div className="bkp-doctors-grid">
              {filtered.length ? filtered.map((doc) => (
                <button key={doc.id} className={`bkp-doc-card ${selectedDoctor?.id === doc.id ? "selected" : ""}`} onClick={() => { setSelectedDoctor(doc); setSelectedDate(null); setSelectedTime(null); }}>
                  <div className="bkp-doc-img-wrap">
                    <img src={doc.db_id ? (doc.avatar_url || doc.avatar) : (DOCTOR_IMAGES[doc.id] || doc.avatar)} alt={doc.name} className="bkp-doc-img" onError={(e) => { e.target.style.display = "none"; }} />
                    <div className="bkp-doc-img-fallback">{typeof doc.avatar === "string" && doc.avatar.length <= 3 ? doc.avatar : doc.name?.[0]}</div>
                    {doc.available && <span className="bkp-doc-online">●</span>}
                  </div>
                  <div className="bkp-doc-body">
                    <strong className="bkp-doc-name">{doc.name}</strong>
                    <span className="bkp-doc-title">{doc.title}</span>
                    <div className="bkp-doc-tags">
                      <span className="bkp-tag specialty">{doc.specialty}</span>
                      <span className="bkp-tag rating">⭐ {doc.rating}</span>
                      <span className="bkp-tag">{doc.reviews} reviews</span>
                    </div>
                    <div className="bkp-doc-bottom">
                      <div className="bkp-doc-detail"><span>🏥</span>{doc.hospital}</div>
                      <div className="bkp-doc-detail"><span>💼</span>{doc.exp} experience</div>
                    </div>
                  </div>
                  <div className="bkp-doc-price">
                    <strong>{doc.fee}</strong>
                    <span>per visit</span>
                  </div>
                  {selectedDoctor?.id === doc.id && <div className="bkp-doc-selected-badge">✓ Selected</div>}
                </button>
              )) : (
                <div className="bkp-empty">No specialists found matching your criteria.</div>
              )}
            </div>

            {/* Booking Modal */}
            {selectedDoctor && (
              <div className="bkp-modal-overlay" onClick={(e) => { if (e.target.className === "bkp-modal-overlay") { setSelectedDoctor(null); setSelectedDate(null); setSelectedTime(null); } }}>
                <div className="bkp-modal">
                  <button className="bkp-modal-close" onClick={() => { setSelectedDoctor(null); setSelectedDate(null); setSelectedTime(null); }}>
                    <X size={18} />
                  </button>
                  <div className="bkp-side-card">
                    <div className="bkp-side-doc">
                      <img src={selectedDoctor.db_id ? (selectedDoctor.avatar_url || selectedDoctor.avatar) : (DOCTOR_IMAGES[selectedDoctor.id] || selectedDoctor.avatar)} alt={selectedDoctor.name} className="bkp-side-img" onError={(e) => { e.target.style.display = "none"; }} />
                      <div>
                        <strong>{selectedDoctor.name}</strong>
                        <span>{selectedDoctor.title}</span>
                      </div>
                    </div>

                    <div className="bkp-side-section">
                      <h4>Select Date</h4>
                      <div className="bkp-side-dates">
                        {timeSlots.map((slot) => (
                          <button key={slot.date} className={`bkp-date-chip ${selectedDate?.date === slot.date ? "active" : ""}`}
                            onClick={() => { setSelectedDate(slot); setSelectedTime(null); }}>
                            {slot.date}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedDate && (
                      <div className="bkp-side-section">
                        <h4>Select Time</h4>
                        <div className="bkp-side-times">
                          {selectedDate.times.map((t) => (
                            <button key={t} className={`bkp-time-chip ${selectedTime === t ? "active" : ""}`} onClick={() => setSelectedTime(t)}>{t}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDoctor && selectedDate && selectedTime && (
                      <div className="bkp-side-summary">
                        <div className="bkp-sum-row"><span>Doctor</span><strong>{selectedDoctor.name}</strong></div>
                        <div className="bkp-sum-row"><span>Date</span><strong>{selectedDate.date}</strong></div>
                        <div className="bkp-sum-row"><span>Time</span><strong>{selectedTime}</strong></div>
                        <div className="bkp-sum-row"><span>Fee</span><strong>{selectedDoctor.fee}</strong></div>
                        <button className="bkp-book-btn" onClick={handleBook} disabled={bookingLoading}>
                          {bookingLoading ? (<><div className="loading-spinner small" /> Booking…</>) : "✅ Confirm Appointment"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
