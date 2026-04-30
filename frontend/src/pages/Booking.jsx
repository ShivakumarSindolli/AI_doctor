import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { SPECIALISTS, generateTimeSlots, uid, buildRecordSummary } from "../utils/api";
import Navbar from "../components/Navbar";

const ALL_SPECIALTIES = Object.keys(SPECIALISTS);
const ALL_DOCTORS = ALL_SPECIALTIES.flatMap((s) => SPECIALISTS[s].map((d) => ({ ...d, specialty: s })));

const DOCTOR_IMAGES = {
  "dr-1": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face",
  "dr-2": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face",
  "dr-3": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face",
  "dr-4": "https://images.unsplash.com/photo-1594824476967-48c8b964d31e?w=200&h=200&fit=crop&crop=face",
  "dr-5": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop&crop=face",
  "dr-6": "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=200&h=200&fit=crop&crop=face",
  "dr-7": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop&crop=face",
  "dr-8": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face",
  "dr-9": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face",
  "dr-10": "https://images.unsplash.com/photo-1594824476967-48c8b964d31e?w=200&h=200&fit=crop&crop=face",
  "dr-11": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face",
};

export default function Booking() {
  const { profile, addAppointment, setToast, history } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const filtered = useMemo(() => {
    let docs = activeFilter === "all" ? ALL_DOCTORS : ALL_DOCTORS.filter((d) => d.specialty === activeFilter);
    const term = search.trim().toLowerCase();
    if (term) docs = docs.filter((d) => `${d.name} ${d.title} ${d.hospital} ${d.specialty}`.toLowerCase().includes(term));
    return docs;
  }, [activeFilter, search]);

  function handleBook() {
    if (!selectedDoctor || !selectedDate || !selectedTime) { setToast("Select a doctor, date, and time."); return; }
    setBookingLoading(true);
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
                    <img src={DOCTOR_IMAGES[doc.id]} alt={doc.name} className="bkp-doc-img" onError={(e) => { e.target.style.display = "none"; }} />
                    <div className="bkp-doc-img-fallback">{doc.avatar}</div>
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

            {/* Booking Sidebar */}
            {selectedDoctor && (
              <aside className="bkp-sidebar">
                <div className="bkp-side-card">
                  <div className="bkp-side-doc">
                    <img src={DOCTOR_IMAGES[selectedDoctor.id]} alt={selectedDoctor.name} className="bkp-side-img" onError={(e) => { e.target.style.display = "none"; }} />
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
              </aside>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
