import { useEffect, useMemo, useRef, useState } from "react";
import doctorHero from "./doctor-hero.svg";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const GENDERS = ["Male", "Female", "Other"];
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

function uid() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function joinList(items) {
  if (!items || !items.length) return "No major findings listed.";
  return items.join(", ");
}

function getAudioUrl(payload) {
  if (!payload) return "";
  if (payload.audio_url) {
    return `${API_BASE}${payload.audio_url}`;
  }
  if (payload.audio_path) {
    const clean = payload.audio_path.split(/[\\/]/).pop();
    return `${API_BASE}/audio/${clean}`;
  }
  return "";
}

function buildRecordSummary(record) {
  const topCondition = record?.diagnosis?.differential_diagnosis?.[0]?.condition;
  return topCondition || record.specialist || "Consultation";
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const detail = typeof data === "string" ? data : data?.detail || "Request failed.";
    throw new Error(detail);
  }
  return data;
}

function Icon({ children, className = "" }) {
  return (
    <span className={`icon-shell ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ActionTile({ title, description, icon, onClick }) {
  return (
    <button className="action-tile" onClick={onClick} type="button">
      <div className="action-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </button>
  );
}

function DiagnosisPanel({ record }) {
  const diagnosis = record?.diagnosis || {};
  const differentials = diagnosis.differential_diagnosis || [];
  const tests = diagnosis.recommended_tests || [];
  const redFlags = diagnosis.red_flags || [];
  const advice = diagnosis.lifestyle_advice || [];

  return (
    <div className="diagnosis-grid">
      <div className="diagnosis-card wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Primary Assessment</p>
            <h3>Differential diagnosis</h3>
          </div>
        </div>
        <div className="diagnosis-list">
          {differentials.length ? (
            differentials.map((item, index) => (
              <div key={`${item.condition}-${index}`} className="diagnosis-item">
                <div>
                  <strong>{item.condition}</strong>
                  <span>{item.likelihood}</span>
                </div>
                <p>{item.reasoning}</p>
              </div>
            ))
          ) : (
            <p className="muted-copy">Diagnosis details will appear after a consultation is submitted.</p>
          )}
        </div>
      </div>

      <div className="diagnosis-card">
        <p className="eyebrow">Recommended tests</p>
        <h3>Next clinical checks</h3>
        <ul className="pill-list">
          {tests.length ? tests.map((item) => <li key={item}>{item}</li>) : <li>No tests suggested yet.</li>}
        </ul>
      </div>

      <div className="diagnosis-card">
        <p className="eyebrow">Urgent signs</p>
        <h3>Red flags</h3>
        <ul className="pill-list warning">
          {redFlags.length ? redFlags.map((item) => <li key={item}>{item}</li>) : <li>No urgent red flags captured.</li>}
        </ul>
      </div>

      <div className="diagnosis-card">
        <p className="eyebrow">Care plan</p>
        <h3>Lifestyle advice</h3>
        <ul className="pill-list success">
          {advice.length ? advice.map((item) => <li key={item}>{item}</li>) : <li>No lifestyle guidance listed yet.</li>}
        </ul>
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("ai_doctor_token") || "");
  const [view, setView] = useState(() => (localStorage.getItem("ai_doctor_token") ? "dashboard" : "landing"));
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [consulting, setConsulting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [toast, setToast] = useState("");
  const [history, setHistory] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sessionId, setSessionId] = useState(uid());
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [consultation, setConsultation] = useState(null);
  const [profileDraft, setProfileDraft] = useState({
    full_name: "",
    age: "",
    gender: "",
    blood_type: "",
    allergies: "",
    medications: ""
  });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    full_name: "",
    password: "",
    age: "",
    gender: "Male",
    blood_type: "O+",
    allergies: "",
    medications: ""
  });

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioInputRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!token) return;
    hydrateDashboard(token);
  }, []);

  useEffect(() => {
    if (!profile) return;
    setProfileDraft({
      full_name: profile.full_name || "",
      age: profile.age || "",
      gender: profile.gender || "",
      blood_type: profile.blood_type || "",
      allergies: profile.allergies || "",
      medications: profile.medications || ""
    });
  }, [profile]);

  const filteredHistory = useMemo(() => {
    const term = historySearch.trim().toLowerCase();
    if (!term) return history;
    return history.filter((item) => {
      const summary = `${item.patient_text} ${item.specialist} ${buildRecordSummary(item)}`.toLowerCase();
      return summary.includes(term);
    });
  }, [history, historySearch]);

  async function hydrateDashboard(activeToken = token) {
    setDashboardLoading(true);
    try {
      const [profileData, historyData] = await Promise.all([
        apiFetch("/patients/me", {
          headers: { Authorization: `Bearer ${activeToken}` }
        }),
        apiFetch("/history/?limit=20", {
          headers: { Authorization: `Bearer ${activeToken}` }
        })
      ]);
      const normalizedHistory = (historyData.consultations || []).map((item) => ({
        ...item,
        audio_player_url: getAudioUrl(item)
      }));

      setProfile(profileData);
      setHistory(normalizedHistory);
      setSelectedRecord((current) => current || normalizedHistory[0] || null);
      setConsultation((current) => current || normalizedHistory[0] || null);
    } catch (error) {
      setToast(error.message);
    } finally {
      setDashboardLoading(false);
    }
  }

  function persistToken(nextToken) {
    setToken(nextToken);
    if (nextToken) {
      localStorage.setItem("ai_doctor_token", nextToken);
    } else {
      localStorage.removeItem("ai_doctor_token");
    }
  }

  function openAuth(mode) {
    setAuthMode(mode);
    setShowAuth(true);
    setAuthError("");
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const body = new URLSearchParams();
      body.append("username", loginForm.email);
      body.append("password", loginForm.password);
      const data = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      persistToken(data.access_token);
      setShowAuth(false);
      setView("dashboard");
      setToast("Welcome back. Your clinical workspace is ready.");
      await hydrateDashboard(data.access_token);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const payload = {
        ...registerForm,
        age: registerForm.age ? Number(registerForm.age) : null,
        allergies: registerForm.allergies || null,
        medications: registerForm.medications || null
      };
      const data = await apiFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      persistToken(data.access_token);
      setShowAuth(false);
      setView("dashboard");
      setToast("Account created. You are now signed in.");
      await hydrateDashboard(data.access_token);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    try {
      const payload = {
        full_name: profileDraft.full_name || null,
        age: profileDraft.age ? Number(profileDraft.age) : null,
        gender: profileDraft.gender || null,
        blood_type: profileDraft.blood_type || null,
        allergies: profileDraft.allergies || null,
        medications: profileDraft.medications || null
      };
      await apiFetch("/patients/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      setProfile((current) => ({ ...current, ...payload }));
      setToast("Profile updated successfully.");
    } catch (error) {
      setToast(error.message);
    }
  }

  async function handleDeleteRecord(id) {
    try {
      await apiFetch(`/history/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const nextHistory = history.filter((item) => item.id !== id);
      setHistory(nextHistory);
      if (selectedRecord?.id === id) {
        setSelectedRecord(nextHistory[0] || null);
        setConsultation(nextHistory[0] || null);
      }
      setToast("Consultation removed.");
    } catch (error) {
      setToast(error.message);
    }
  }

  function resetComposer() {
    setAudioFile(null);
    setAudioUrl("");
    setImageFile(null);
    setImagePreview("");
  }

  function startNewSession() {
    setSessionId(uid());
    setConsultation(null);
    setSelectedRecord(null);
    resetComposer();
    setToast("Fresh consultation session ready.");
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const extension = recorder.mimeType.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `symptom-recording.${extension}`, { type: blob.type });
        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      streamRef.current = stream;
      setIsRecording(true);
      setToast("Recording started. Describe symptoms clearly.");
    } catch (error) {
      setToast("Microphone access was denied or unavailable.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function handleAudioUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setToast("Audio file attached.");
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setToast("Clinical image attached.");
  }

  async function handleConsult() {
    if (!token) {
      openAuth("login");
      return;
    }
    if (!audioFile) {
      setToast("Please record or upload an audio symptom note first.");
      return;
    }

    setConsulting(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("session_id", sessionId);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const payload = await apiFetch("/consult/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const normalized = { ...payload, audio_player_url: getAudioUrl(payload) };
      setConsultation(normalized);
      setSelectedRecord(normalized);
      setHistory((current) => [normalized, ...current.filter((item) => item.id !== normalized.id)].slice(0, 20));
      setToast("Consultation completed successfully.");
      await hydrateDashboard(token);
    } catch (error) {
      setToast(error.message);
    } finally {
      setConsulting(false);
    }
  }

  function handleLogout() {
    persistToken("");
    setView("landing");
    setProfile(null);
    setHistory([]);
    setConsultation(null);
    setSelectedRecord(null);
    resetComposer();
    setToast("Signed out.");
  }

  const activeRecord = selectedRecord || consultation;
  const profileCompletion = profile
    ? [profile.age, profile.gender, profile.blood_type, profile.allergies, profile.medications].filter(Boolean).length * 20
    : 0;

  return (
    <div className="app-shell">
      {toast ? <div className="toast">{toast}</div> : null}

      {!token || view === "landing" ? (
        <main className="landing-page">
          <header className="landing-nav">
            <div className="brand-mark">
              <div className="brand-pulse" />
              <div>
                <strong>AI Doctor Pro</strong>
                <span>Clinical intelligence platform</span>
              </div>
            </div>

            <nav className="landing-links">
              <a href="#solutions">Solutions</a>
              <a href="#experience">Experience</a>
              <a href="#features">Features</a>
              <a href="#contact">Contact</a>
            </nav>

            <div className="landing-actions">
              <button className="ghost-button" type="button" onClick={() => openAuth("login")}>
                Sign in
              </button>
              <button className="primary-button" type="button" onClick={() => openAuth("register")}>
                Get started
              </button>
            </div>
          </header>

          <section className="hero-section">
            <div className="hero-copy">
              <span className="hero-badge">New: Voice, vision, triage, RAG, and safety guardrails in one workflow</span>
              <h1>
                AI-powered <span>healthcare UX</span> for faster and better decisions.
              </h1>
              <p>
                Deliver an industry-grade patient experience with secure symptom recording, medical image analysis,
                differential diagnosis support, and clinician-ready summaries.
              </p>

              <div className="hero-buttons">
                <button className="primary-button large" type="button" onClick={() => openAuth("register")}>
                  Launch dashboard
                </button>
                <button
                  className="secondary-button large"
                  type="button"
                  onClick={() => document.getElementById("experience")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Preview product
                </button>
              </div>

              <div className="hero-stats">
                <StatCard value="98%" label="Diagnostic confidence support" />
                <StatCard value="24/7" label="Continuous symptom intake" />
                <StatCard value="1M+" label="Knowledge-ready records" />
                <StatCard value="40%" label="Faster decision workflows" />
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-visual-card floating top">
                <span>System status</span>
                <strong>Analysis complete</strong>
              </div>
              <img src={doctorHero} alt="AI doctor illustration" className="doctor-hero" />
              <div className="hero-visual-card floating bottom">
                <div className="avatar-stack">
                  <span />
                  <span />
                  <span />
                </div>
                <div>
                  <strong>500+</strong>
                  <span>Expert doctors connected</span>
                </div>
              </div>
            </div>
          </section>

          <section id="solutions" className="feature-section">
            <div className="section-heading">
              <span className="eyebrow">Why it feels premium</span>
              <h2>Designed like a modern health-tech product, not a demo.</h2>
            </div>
            <div className="feature-grid">
              <div className="feature-card">
                <strong>Voice-first consultation</strong>
                <p>Microphone recording, upload fallback, audio playback, and structured medical outputs in one flow.</p>
              </div>
              <div className="feature-card">
                <strong>Clinical image support</strong>
                <p>Attach symptom photos or scans and review the vision model findings alongside triage and diagnosis.</p>
              </div>
              <div className="feature-card">
                <strong>Operational dashboard</strong>
                <p>Sidebar history, patient profile management, urgency summary, confidence, and chat-style results.</p>
              </div>
            </div>
          </section>

          <section id="experience" className="preview-section">
            <div className="preview-frame">
              <aside className="preview-sidebar">
                <div className="preview-side-icons">
                  <span />
                  <span className="active" />
                  <span />
                  <span />
                </div>
                <div className="preview-history-card">
                  <h3>Chat history</h3>
                  <input value="chest pain, dizziness" readOnly />
                  <button type="button">+ New consultation</button>
                  <div className="preview-history-items">
                    <div>How can I optimize triage response?</div>
                    <div>What is the best way to design diagnosis cards?</div>
                    <div>How can symptom capture feel intuitive?</div>
                  </div>
                </div>
              </aside>

              <div className="preview-main">
                <div className="preview-topbar">
                  <span>Care Engine v5.0</span>
                  <div className="preview-user">Medical Admin</div>
                </div>
                <div className="preview-center">
                  <div className="preview-orb" />
                  <h3>Welcome to AI Doctor Pro</h3>
                  <p>Describe what you want to assess and the assistant will handle the rest.</p>
                  <div className="preview-actions">
                    <span>Generate diagnosis</span>
                    <span>Review image</span>
                    <span>Improve prompt</span>
                    <span>Dashboard design</span>
                  </div>
                </div>
                <div className="preview-composer">
                  <span>Describe symptoms, attach files, or start voice capture...</span>
                  <button type="button">Send</button>
                </div>
              </div>
            </div>
          </section>

          <section id="features" className="cta-section">
            <div>
              <span className="eyebrow">Ready to modernize the product?</span>
              <h2>Ship a frontend experience that looks enterprise-grade from day one.</h2>
            </div>
            <button className="primary-button large" type="button" onClick={() => openAuth("register")}>
              Start using the dashboard
            </button>
          </section>
        </main>
      ) : null}

      {token && view === "dashboard" ? (
        <div className="dashboard-shell">
          <aside className="dashboard-sidebar">
            <div className="brand-block">
              <div className="brand-mark">
                <div className="brand-pulse" />
                <div>
                  <strong>AI Doctor Pro</strong>
                  <span>Clinical workspace</span>
                </div>
              </div>
              <button className="sidebar-new" type="button" onClick={startNewSession}>
                + New session
              </button>
            </div>

            <label className="search-box">
              <input
                type="text"
                placeholder="Search history"
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
              />
            </label>

            <div className="history-list">
              {filteredHistory.length ? (
                filteredHistory.map((item) => (
                  <button
                    type="button"
                    className={`history-item ${activeRecord?.session_id === item.session_id ? "active" : ""}`}
                    key={`${item.session_id}-${item.date}`}
                    onClick={() => {
                      setSelectedRecord({ ...item, audio_player_url: getAudioUrl(item) });
                      setConsultation({ ...item, audio_player_url: getAudioUrl(item) });
                    }}
                  >
                    <div>
                      <strong>{buildRecordSummary(item)}</strong>
                      <span>{item.specialist || "General medicine"}</span>
                    </div>
                    <p>{item.patient_text?.slice(0, 90) || "Voice consultation record."}</p>
                    <small>{formatDate(item.date)}</small>
                  </button>
                ))
              ) : (
                <div className="empty-panel">
                  <strong>No consultation history yet</strong>
                  <span>Run your first audio diagnosis to populate the dashboard.</span>
                </div>
              )}
            </div>

            <div className="sidebar-footer">
              <button className="ghost-button full" type="button" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </aside>

          <main className="dashboard-main">
            <header className="dashboard-header">
              <div>
                <span className="eyebrow">Patient intelligence dashboard</span>
                <h1>Welcome back, {profile?.full_name?.split(" ")[0] || "Doctor"}</h1>
              </div>
              <div className="header-actions">
                <button className="secondary-button" type="button" onClick={() => setView("landing")}>
                  View landing
                </button>
                <div className="profile-chip">
                  <div className="profile-chip-avatar">{profile?.full_name?.[0] || "A"}</div>
                  <div>
                    <strong>{profile?.full_name || "Medical user"}</strong>
                    <span>{profile?.email || "Signed in"}</span>
                  </div>
                </div>
              </div>
            </header>

            <section className="dashboard-hero-card">
              <div>
                <span className="eyebrow">AI Diagnostic Workspace</span>
                <h2>Capture symptoms, review findings, and deliver safer guidance.</h2>
                <p>
                  Record the patient voice note, attach a medical image when available, and let the platform produce
                  triage, diagnostic suggestions, voice output, and history records.
                </p>
              </div>
              <div className="dashboard-hero-orb" />
            </section>

            <section className="action-row">
              <ActionTile
                title={isRecording ? "Stop recording" : "Record symptoms"}
                description={isRecording ? "Click to finish the voice capture." : "Use the microphone for symptom intake."}
                onClick={isRecording ? stopRecording : startRecording}
                icon={
                  <Icon>
                    <path d="M12 16a4 4 0 0 0 4-4V8a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Z" />
                    <path d="M19 11a7 7 0 0 1-14 0" />
                    <path d="M12 18v4" />
                  </Icon>
                }
              />
              <ActionTile
                title="Upload audio"
                description="Attach a prerecorded symptom note if needed."
                onClick={() => audioInputRef.current?.click()}
                icon={
                  <Icon>
                    <path d="M12 3v12" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M5 21h14" />
                  </Icon>
                }
              />
              <ActionTile
                title="Attach image"
                description="Include a clinical photo or scan for vision analysis."
                onClick={() => imageInputRef.current?.click()}
                icon={
                  <Icon>
                    <rect x="3" y="5" width="18" height="14" rx="3" />
                    <circle cx="9" cy="10" r="1.5" />
                    <path d="m21 15-4.5-4.5L8 19" />
                  </Icon>
                }
              />
              <ActionTile
                title={consulting ? "Analyzing..." : "Consult now"}
                description="Run STT, triage, diagnosis, safety, and TTS."
                onClick={handleConsult}
                icon={
                  <Icon>
                    <path d="m5 12 5 5L20 7" />
                  </Icon>
                }
              />
            </section>

            <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={handleAudioUpload} />
            <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />

            <div className="workspace-grid">
              <section className="workspace-primary">
                <div className="workspace-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Consultation composer</p>
                      <h3>Input controls</h3>
                    </div>
                    <span className="session-tag">Session {sessionId.slice(0, 8)}</span>
                  </div>

                  <div className="composer-grid">
                    <div className="composer-card">
                      <span>Voice input</span>
                      <strong>{audioFile ? audioFile.name : "No audio selected"}</strong>
                      <p>{isRecording ? "Recording live..." : "Record or upload an audio note to start diagnosis."}</p>
                      {audioUrl ? <audio controls src={audioUrl} className="audio-player" /> : null}
                    </div>

                    <div className="composer-card">
                      <span>Medical image</span>
                      <strong>{imageFile ? imageFile.name : "Optional upload"}</strong>
                      <p>Attach a rash, report, scan, or any relevant image to improve specialist routing.</p>
                      {imagePreview ? <img src={imagePreview} alt="Clinical upload preview" className="preview-image" /> : null}
                    </div>
                  </div>
                </div>

                <div className="workspace-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Conversation</p>
                      <h3>Diagnosis chat</h3>
                    </div>
                    {activeRecord?.id ? (
                      <button className="ghost-button subtle" type="button" onClick={() => handleDeleteRecord(activeRecord.id)}>
                        Delete record
                      </button>
                    ) : null}
                  </div>

                  <div className="chat-thread">
                    <article className="chat-bubble user">
                      <span className="bubble-label">Patient transcript</span>
                      <p>{activeRecord?.patient_text || "The transcription will appear here after you submit a consultation."}</p>
                    </article>
                    <article className="chat-bubble assistant">
                      <span className="bubble-label">AI doctor response</span>
                      <p>{activeRecord?.doctor_response || "The clinician-style response will appear here once the system completes analysis."}</p>
                    </article>
                  </div>

                  <div className="meta-strip">
                    <div>
                      <span>Specialist</span>
                      <strong>{activeRecord?.specialist || "Awaiting analysis"}</strong>
                    </div>
                    <div>
                      <span>Urgency</span>
                      <strong>{activeRecord?.urgency || activeRecord?.triage?.urgency || "Routine"}</strong>
                    </div>
                    <div>
                      <span>Confidence</span>
                      <strong>{activeRecord?.confidence ? `${Math.round(activeRecord.confidence * 100)}%` : "Pending"}</strong>
                    </div>
                    <div>
                      <span>Safety</span>
                      <strong>{activeRecord?.flagged ? "Flagged" : "Clear"}</strong>
                    </div>
                  </div>
                </div>

                <DiagnosisPanel record={activeRecord} />
              </section>

              <aside className="workspace-secondary">
                <div className="workspace-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Patient profile</p>
                      <h3>Medical context</h3>
                    </div>
                  </div>

                  <div className="completion-bar">
                    <div style={{ width: `${profileCompletion}%` }} />
                  </div>
                  <small className="completion-text">{profileCompletion}% profile completion</small>

                  <form className="profile-form" onSubmit={handleProfileSave}>
                    <input
                      placeholder="Full name"
                      value={profileDraft.full_name}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, full_name: event.target.value }))}
                    />
                    <div className="double-fields">
                      <input
                        placeholder="Age"
                        type="number"
                        value={profileDraft.age}
                        onChange={(event) => setProfileDraft((current) => ({ ...current, age: event.target.value }))}
                      />
                      <select
                        value={profileDraft.gender}
                        onChange={(event) => setProfileDraft((current) => ({ ...current, gender: event.target.value }))}
                      >
                        <option value="">Gender</option>
                        {GENDERS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <select
                      value={profileDraft.blood_type}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, blood_type: event.target.value }))}
                    >
                      <option value="">Blood type</option>
                      {BLOOD_TYPES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <textarea
                      rows="3"
                      placeholder="Allergies"
                      value={profileDraft.allergies}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, allergies: event.target.value }))}
                    />
                    <textarea
                      rows="3"
                      placeholder="Current medications"
                      value={profileDraft.medications}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, medications: event.target.value }))}
                    />
                    <button className="primary-button full" type="submit">
                      Save profile
                    </button>
                  </form>
                </div>

                <div className="workspace-panel">
                  <p className="eyebrow">AI findings</p>
                  <h3>Vision and triage overview</h3>
                  <div className="summary-stack">
                    <div className="summary-card">
                      <span>Vision findings</span>
                      <p>{activeRecord?.vision_findings?.findings || "Attach an image to receive structured visual analysis."}</p>
                    </div>
                    <div className="summary-card">
                      <span>Abnormalities</span>
                      <p>{joinList(activeRecord?.vision_findings?.abnormalities)}</p>
                    </div>
                    <div className="summary-card">
                      <span>ICD hints</span>
                      <p>{Array.isArray(activeRecord?.icd_codes) ? joinList(activeRecord.icd_codes) : activeRecord?.icd_codes || "No ICD hints returned."}</p>
                    </div>
                  </div>
                  {activeRecord?.audio_player_url ? (
                    <div className="result-audio">
                      <span>Doctor voice output</span>
                      <audio controls src={activeRecord.audio_player_url} className="audio-player" />
                    </div>
                  ) : null}
                </div>
              </aside>
            </div>
          </main>
        </div>
      ) : null}

      {showAuth ? (
        <div className="auth-backdrop" onClick={() => setShowAuth(false)}>
          <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
            <div className="auth-tabs">
              <button
                type="button"
                className={authMode === "login" ? "active" : ""}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === "register" ? "active" : ""}
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
            </div>

            {authMode === "login" ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <h3>Welcome back</h3>
                <p>Sign in to access the patient dashboard and consultation history.</p>
                <input
                  type="email"
                  placeholder="Email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                />
                {authError ? <div className="auth-error">{authError}</div> : null}
                <button className="primary-button full" type="submit" disabled={authLoading}>
                  {authLoading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : (
              <form className="auth-form register" onSubmit={handleRegister}>
                <h3>Create account</h3>
                <p>Set up a patient profile and start a voice-powered diagnosis flow.</p>
                <input
                  type="text"
                  placeholder="Full name"
                  value={registerForm.full_name}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, full_name: event.target.value }))}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                />
                <div className="double-fields">
                  <input
                    type="number"
                    placeholder="Age"
                    value={registerForm.age}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, age: event.target.value }))}
                  />
                  <select
                    value={registerForm.gender}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, gender: event.target.value }))}
                  >
                    {GENDERS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  value={registerForm.blood_type}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, blood_type: event.target.value }))}
                >
                  {BLOOD_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <textarea
                  rows="2"
                  placeholder="Allergies"
                  value={registerForm.allergies}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, allergies: event.target.value }))}
                />
                <textarea
                  rows="2"
                  placeholder="Current medications"
                  value={registerForm.medications}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, medications: event.target.value }))}
                />
                {authError ? <div className="auth-error">{authError}</div> : null}
                <button className="primary-button full" type="submit" disabled={authLoading}>
                  {authLoading ? "Creating account..." : "Create account"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {dashboardLoading ? <div className="loading-ribbon">Syncing profile and history...</div> : null}
    </div>
  );
}

export default App;
