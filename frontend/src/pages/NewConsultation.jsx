import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { apiFetch, getAudioUrl, uid, formatTime, buildRecordSummary, getSpecialistsForType, likelihoodToPercent, getLanguageLabel } from "../utils/api";
import Navbar from "../components/Navbar";

const SUGGESTIONS = [
  { icon: "🦠", title: "Skin rash or lesion", desc: "Fungal/bacterial/allergic" },
  { icon: "👁", title: "Eye redness / discharge", desc: "Conjunctivitis vs infection" },
  { icon: "🩹", title: "Wound or burn", desc: "Infection or healing check" },
  { icon: "🫁", title: "X-Ray or scan image", desc: "AI radiology reading" },
];

export default function NewConsultation() {
  const { token, profile, history, setHistory, setToast, hydrate, language } = useAuth();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(uid());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [consulting, setConsulting] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [results, setResults] = useState(null);

  const mediaRecRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const imageInputRef = useRef(null);
  const feedEndRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (results && feedEndRef.current) feedEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [results]);

  function startNewSession() {
    setSessionId(uid()); setResults(null);
    setImageFile(null); setImagePreview("");
    setAudioFile(null); setAudioUrl(""); setRecordTime(0);
  }

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const ext = recorder.mimeType.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `symptom-recording.${ext}`, { type: blob.type });
        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorder.start();
      mediaRecRef.current = recorder;
      streamRef.current = stream;
      setIsRecording(true);
      setRecordTime(0);
      // Clear any existing timer first, then start new one
      stopTimer();
      timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
      setToast("Recording started. Describe symptoms clearly.");
    } catch {
      setToast("Microphone access was denied.");
    }
  }

  function stopRecording() {
    // Stop timer FIRST
    stopTimer();
    setIsRecording(false);
    // Then stop recorder
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setToast("Image must be under 10MB"); return; }
    setImageFile(file); setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() { setImageFile(null); setImagePreview(""); }

  async function handleAnalyse() {
    if (!audioFile && !imageFile) { setToast("Please record voice or upload an image first."); return; }
    if (!audioFile) { setToast("Voice recording is required for consultation."); return; }
    setConsulting(true); setLoadingStep("Analysing image with Llama 4 Scout Vision…");
    try {
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("session_id", sessionId);
      formData.append("language", language);
      if (imageFile) formData.append("image", imageFile);
      setLoadingStep("Processing voice with Whisper STT…");
      const payload = await apiFetch("/consult/", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const normalized = { ...payload, audio_player_url: getAudioUrl(payload) };
      setResults(normalized);
      setHistory((cur) => [normalized, ...cur.filter((i) => i.session_id !== normalized.session_id)].slice(0, 50));
      setToast("Consultation completed successfully.");
      hydrate(token);
    } catch (err) { setToast(err.message); } finally { setConsulting(false); setLoadingStep(""); }
  }

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const recentSessions = history.slice(0, 8);
  const confidence = results?.confidence ? Math.round(results.confidence * 100) : 0;
  const differentials = results?.diagnosis?.differential_diagnosis || [];
  const visionFindings = results?.vision_findings;
  const treatment = results?.diagnosis?.treatment_plan || results?.doctor_response || "";
  const specialists = results ? getSpecialistsForType(results.specialist) : [];

  return (
    <div className="app-page">
      <Navbar />
      <div className="consult-layout">
        {/* Sidebar */}
        <aside className={`consult-sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
          <div className="cs-brand">
            <button className="nav-brand" onClick={() => navigate("/consult/new")}>
              <span className="nav-brand-icon">✦</span>
              <span className="nav-brand-text">MediAI</span>
            </button>
          </div>
          <button className="cs-new-btn" onClick={startNewSession}>＋ New Analysis</button>
          <div className="cs-divider" />
          <p className="cs-section-label">RECENT</p>
          <div className="cs-recent-list">
            {recentSessions.length ? recentSessions.map((r, i) => (
              <button key={r.session_id || i} className={`cs-recent-item ${r.session_id === sessionId ? "active" : ""}`}
                onClick={() => { setSessionId(r.session_id); setResults({ ...r, audio_player_url: getAudioUrl(r) }); }}>
                <strong>{buildRecordSummary(r)}</strong>
                <span>{r.date ? new Date(r.date).toLocaleDateString() : "Now"}</span>
              </button>
            )) : <p className="cs-empty">No recent sessions</p>}
          </div>
          <div className="cs-divider" />
          <div className="cs-user-info">
            <div className="cs-user-avatar">{profile?.full_name?.[0] || "D"}</div>
            <div>
              <strong>{profile?.full_name || "Doctor"}</strong>
              <span>{profile?.gender || "Specialist"}</span>
            </div>
          </div>
        </aside>

        <button className="cs-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? "‹" : "›"}</button>

        {/* Main Area */}
        <div className="consult-main">
          <div className="consult-header-bar">
            <div className="consult-header-left">
              <h2>AI Disease Analysis</h2>
              <span className="consult-online-badge">● Online</span>
            </div>
            <button className="ghost-button" onClick={() => navigate("/history")}>← Back</button>
          </div>

          {/* Results Feed */}
          <div className="consult-feed">
            {!results && !consulting ? (
              <div className="consult-empty">
                <div className="consult-empty-orb"><div className="orb-inner" /><div className="orb-ring" /><div className="orb-ring r2" /></div>
                <h3>How can I help you today?</h3>
                <p>Upload a medical image and/or record your symptoms to begin AI analysis.</p>
                <div className="consult-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s.title} className="consult-suggest-card" onClick={() => setToast(`Upload an image of: ${s.title}`)}>
                      <span className="suggest-icon">{s.icon}</span>
                      <strong>{s.title}</strong>
                      <span>{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {consulting && (
              <div className="consult-loading-bubble">
                <div className="loading-spinner" />
                <div><strong>AI is analysing…</strong><p>{loadingStep}</p></div>
              </div>
            )}

            {results && (
              <div className="consult-results">
                {/* User Upload Bubble */}
                <div className="bubble bubble-user">
                  <div className="bubble-content-user">
                    {imagePreview && <img src={imagePreview} alt="Upload" className="bubble-thumb" />}
                    <div>
                      {imageFile && <p className="bubble-filename">📎 {imageFile.name} · {(imageFile.size / 1024).toFixed(1)} KB</p>}
                      {results.patient_text && <p className="bubble-voice-snippet"><em>🎙 "{results.patient_text.slice(0, 80)}…"</em></p>}
                    </div>
                  </div>
                  <span className="bubble-time">{formatTime(new Date())}</span>
                </div>

                {/* AI Transcript */}
                <div className="bubble bubble-ai transcript-card">
                  <div className="transcript-label">
                    🎙 VOICE TRANSCRIPT
                    {results.language && results.language !== "en" && (
                      <span className="lang-badge">{getLanguageLabel(results.language)}</span>
                    )}
                  </div>
                  <p className="transcript-text">"{results.patient_text}"</p>
                  {results.patient_text_en && (
                    <p className="transcript-translation">🔄 English: "{results.patient_text_en}"</p>
                  )}
                  <span className="transcript-conf">Diagnosis Confidence · {confidence}%</span>
                </div>

                {/* Vision Findings */}
                {visionFindings && (
                  <div className="bubble bubble-ai vision-card">
                    <div className="vision-label">🔍 VISUAL FINDINGS <span>Llama 4 Scout Vision</span></div>
                    <ul className="vision-list">
                      {visionFindings.findings ? <li>{visionFindings.findings}</li> : null}
                      {(visionFindings.abnormalities || []).map((a, i) => <li key={i}>• {a}</li>)}
                      {visionFindings.severity && <li>Severity: {visionFindings.severity}</li>}
                    </ul>
                  </div>
                )}

                {/* Diagnosis Card */}
                <div className="bubble bubble-ai diagnosis-bubble">
                  <div className="diag-header">
                    {imagePreview && <img src={imagePreview} alt="thumb" className="diag-thumb" />}
                    <div className="diag-header-info">
                      <span className="diag-label">PRIMARY DIAGNOSIS</span>
                      <h3>{differentials[0]?.condition || buildRecordSummary(results)}</h3>
                      {results.icd_codes?.length > 0 && <span className="diag-icd">ICD-10: {Array.isArray(results.icd_codes) ? results.icd_codes.join(", ") : results.icd_codes}</span>}
                      <div className="diag-conf-row">
                        <div className="diag-conf-bar"><div style={{ width: `${confidence}%` }} /></div>
                        <span>{confidence}%</span>
                        <span className="diag-urgency-pill" data-urgency={results.urgency || "routine"}>{results.urgency || "Routine"}</span>
                      </div>
                    </div>
                  </div>
                  {visionFindings && (
                    <div className="diag-section"><h4>🔍 Visual Findings</h4>
                      <ul>{visionFindings.findings && <li>{visionFindings.findings}</li>}{(visionFindings.abnormalities || []).map((a, i) => <li key={i}>{a}</li>)}</ul>
                    </div>
                  )}
                  {differentials.length > 0 && (
                    <div className="diag-section"><h4>📊 Differential Diagnoses</h4>
                      {differentials.map((d, i) => (
                        <div key={i} className="diff-item">
                          <span>{d.condition}</span>
                          <div className="diff-bar"><div style={{ width: `${likelihoodToPercent(d.likelihood)}%` }} /></div>
                          <span className="diff-pct">{likelihoodToPercent(d.likelihood)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="diag-section"><h4>💊 Treatment Plan</h4><p>{treatment}</p></div>
                  <div className="diag-warning">⚠ AI decision support only — confirm with a clinician before prescribing.</div>
                </div>

                {/* Voice Player */}
                {results.audio_player_url && (
                  <div className="bubble bubble-ai voice-player-bubble">
                    <div className="voice-player-header">
                      <span className="voice-player-icon">🔊</span>
                      <div><strong>Voice Response</strong><span>ElevenLabs TTS · Clinical Female</span></div>
                    </div>
                    <audio controls src={results.audio_player_url} className="voice-player-audio" autoPlay />
                  </div>
                )}

                {/* ★ SPECIALIST SUGGESTION — redirects to /booking */}
                <div className="bubble bubble-ai specialist-suggest-card">
                  <div className="ssc-header">
                    <div className="ssc-icon-wrap"><span>🏥</span></div>
                    <div>
                      <span className="ssc-label">AI SPECIALIST RECOMMENDATION</span>
                      <h3>Recommended: <span className="ssc-specialty">{(results.specialist || "General").charAt(0).toUpperCase() + (results.specialist || "general").slice(1)}</span> Specialist</h3>
                    </div>
                  </div>
                  <p className="ssc-reason">
                    Based on the diagnosis of <strong>{differentials[0]?.condition || buildRecordSummary(results)}</strong> with {confidence}% confidence,
                    MediAI recommends consulting a <strong>{results.specialist || "general"}</strong> specialist for further evaluation.
                  </p>
                  <div className="ssc-doctors-preview">
                    {specialists.slice(0, 2).map((doc) => (
                      <div key={doc.id} className="ssc-doc-mini">
                        <div className="ssc-doc-avatar">{doc.avatar}</div>
                        <div><strong>{doc.name}</strong><span>{doc.title} · ⭐ {doc.rating}</span></div>
                      </div>
                    ))}
                  </div>
                  <button className="ssc-book-btn" onClick={() => navigate(`/booking?specialty=${encodeURIComponent(results.specialist || "general")}&session=${results.session_id}`)}>
                    📅 Book Appointment with Specialist
                    <span>Browse doctors, pick a date & time — AI handles the rest</span>
                  </button>
                </div>

                {/* Generate Report */}
                <button className="generate-report-btn" onClick={() => navigate(`/report/${results.session_id}`)}>
                  📄 Generate Full Report
                  <span>Creates a structured PDF report for this consultation</span>
                </button>
              </div>
            )}
            <div ref={feedEndRef} />
          </div>

          {/* Bottom Input Bar */}
          <div className="consult-bottom-bar">
            <div className="input-zones">
              <div className={`input-zone zone-upload ${imageFile ? "has-file" : ""}`} onClick={() => !imageFile && imageInputRef.current?.click()}>
                {imagePreview ? (
                  <div className="zone-preview">
                    <img src={imagePreview} alt="preview" />
                    <button className="zone-remove" onClick={(e) => { e.stopPropagation(); removeImage(); }}>✕</button>
                    <span className="zone-filename">{imageFile.name}</span>
                  </div>
                ) : (
                  <>
                    <span className="zone-icon">🖼</span>
                    <span className="zone-label">Drop image here / tap</span>
                    <div className="zone-pills"><span>📷 Camera</span><span>🖼 Gallery</span></div>
                    <span className="zone-hint">JPG · PNG · HEIC · max 10 MB</span>
                  </>
                )}
                <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
              </div>
              <div className="input-zone zone-record">
                <button className={`mic-btn ${isRecording ? "recording" : ""}`}
                  onClick={isRecording ? stopRecording : startRecording}>
                  {isRecording ? (<><span className="mic-pulse-ring" /><span className="mic-pulse-ring delay" /><span className="mic-icon">⏹</span></>) : <span className="mic-icon">🎙</span>}
                </button>
                {isRecording ? (
                  <><span className="rec-timer">● {fmtTime(recordTime)}</span><div className="rec-waveform">{Array.from({length:12}).map((_,i)=><span key={i} style={{animationDelay:`${i*0.08}s`}}/>)}</div></>
                ) : audioFile ? (
                  <span className="rec-done">✓ {fmtTime(recordTime)} recorded</span>
                ) : (
                  <span className="rec-hint">Tap to Record<br/>Whisper STT</span>
                )}
              </div>
              <button className={`input-zone zone-analyse ${(!audioFile && !imageFile) || isRecording ? "disabled" : ""}`}
                disabled={(!audioFile && !imageFile) || isRecording || consulting} onClick={handleAnalyse}>
                <span className="zone-analyse-icon">{consulting ? "⏳" : "🔍"}</span>
                <strong>{consulting ? "Analysing…" : "Analyse"}</strong>
                <span className="zone-analyse-sub">Vision + LLM + TTS</span>
                <div className="zone-readiness">
                  <span className={imageFile ? "ready" : ""}>✓ Image</span>
                  <span className={audioFile ? "ready" : ""}>✓ Voice</span>
                </div>
              </button>
            </div>
            <p className="consult-disclaimer">MediAI provides clinical decision support only. Always apply independent clinical judgment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
